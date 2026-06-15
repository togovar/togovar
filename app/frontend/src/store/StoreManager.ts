import isEqual from 'lodash/isEqual';
import {
  handleHistoryChange,
  reflectSimpleSearchConditionToURI,
  reflectAdvancedSearchConditionToURI,
} from '../store/searchManager';
import { executeSearch } from '../api/fetchData';
import {
  getDefaultColumnConfigs,
  getInitialColumnWidth,
  normalizeColumnConfigs,
} from '../columns';
import type { StoreState, ResultData, SearchMode } from '../types';

const COLUMNS_STORAGE_KEY = 'columns';

type StoreListener = (value: unknown) => void;

/**
 * アプリ全体の状態を一元管理するシングルトンStore。
 * bind/subscribe/publish によるオブザーバーパターンで状態変化をUIコンポーネントへ伝える。
 * bind（旧API）とsubscribe（新API）の2系統が共存しているが、
 * subscribeへ一本化する方針でbind系は将来削除予定。
 */
class StoreManager {
  /**
   * 旧実装互換のobserver配列。observer[key]() を呼ぶ規約でUIを更新する。
   * subscribe/unsubscribeへ移行中のため将来削除予定。
   * TODO: 廃止されたら削除する
   */
  private _bindings: Record<string, unknown[]> = {};

  /**
   * subscribeで登録されたコールバックのMap。
   * キーはStoreStateのキー名で、値の変化があるたびに対応するSetの全コールバックを呼ぶ。
   */
  private _listeners = new Map<string, Set<StoreListener>>();

  /**
   * popstate経由のモード切替時にreflect*ToURIをスキップするためのフラグ。
   * setSearchModeFromHistoryとsearchModeの組み合わせでpushState二重発火を防ぐ。
   */
  private _fromHistory = false;

  /**
   * アプリ全体の状態オブジェクト。外部からはgetData/setDataのみを通じてアクセスする。
   */
  private _state: StoreState = {
    karyotype: '',
    searchMode: '',
    simpleSearchConditionsMaster: [],
    simpleSearchConditions: {},
    columns: [],
    searchResults: [],
    numberOfRecords: 0,
    offset: 0,
    rowCount: 0,
    appStatus: 'preparing',
    isLogin: false,
    isFetching: false,
    isStoreUpdating: false,
    displayingRegionsOnChromosome: {},
  };

  /**
   * 列設定とイベントの初期化を別メソッドに切り出して処理の意図を明確にする。
   */
  constructor() {
    this._initColumnsState();
    this._initSearchCondition();
  }

  /**
   * localStorageから列設定を復元してstateに適用する。
   * constructorに直接書くと初期化処理が長くなるため切り出している。
   */
  private _initColumnsState() {
    this._state.columns = this._loadColumnsFromStorage();
  }

  /**
   * SSRや壊れたlocalStorageデータに備えてデフォルト値へのフォールバックを保証する。
   * localStorage自体のアクセスが例外を投げる環境があるためtry/catchで保護している。
   */
  private _loadColumnsFromStorage() {
    const fallbackColumns = getDefaultColumnConfigs();

    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return fallbackColumns;
      }

      const raw = window.localStorage.getItem(COLUMNS_STORAGE_KEY);
      if (!raw) {
        return fallbackColumns;
      }

      const columns = this._parseStoredColumns(raw);
      if (!columns) {
        return fallbackColumns;
      }

      return columns;
    } catch (_error) {
      return fallbackColumns;
    }
  }

  /**
   * JSON.parseの結果が配列でない場合はnullを返してフォールバックさせる。
   * normalizeColumnConfigsで古い列設定の構造差異も吸収する。
   */
  private _parseStoredColumns(raw: string): StoreState['columns'] | null {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }

    return normalizeColumnConfigs(parsed);
  }

  /**
   * localStorage容量超過やプライベートブラウズでの書き込み失敗を許容する。
   * 保存できなくてもUIは動作するためエラーを握り潰して継続する。
   */
  private _saveColumnsToStorage(columns: StoreState['columns']) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }

      window.localStorage.setItem(
        COLUMNS_STORAGE_KEY,
        JSON.stringify(normalizeColumnConfigs(columns))
      );
    } catch (_error) {
      // localStorage制限超過やプライベートブラウズ環境では保存失敗を許容
    }
  }

  /**
   * isFetchingの初期化とpopstateリスナー・searchModeの変化監視を登録する。
   * searchModeのsubscribeは検索モード切替に伴う状態リセットと再検索を担う。
   */
  private _initSearchCondition() {
    this.setData('isFetching', false);
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('popstate', handleHistoryChange.bind(this));
    }
    this.subscribe('searchMode', this.searchMode.bind(this));
  }

  /**
   * 呼び出し側がStoreの内部オブジェクトを意図せず変更しないようにdeepCopyして返す。
   * 型パラメータTは呼び出し側で指定する前提で、内部ではas unknown as Tでキャストする。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getData<T = any>(key: keyof StoreState): T {
    return this._deepCopy(this._state[key]) as unknown as T;
  }

  /**
   * columnsだけnormalizeColumnConfigsを通す（列設定の構造を正規化するため）。
   * プリミティブはObject.is、オブジェクトはisEqualで差分検出して不要なpublishをスキップする。
   */
  setData<T extends keyof StoreState>(key: T, newValue: StoreState[T]) {
    const oldValue = this._state[key];
    const nextValue =
      key === 'columns'
        ? (normalizeColumnConfigs(
            newValue as StoreState['columns']
          ) as StoreState[T])
        : newValue;

    if (typeof nextValue !== 'object' || nextValue === null) {
      if (!Object.is(oldValue, nextValue)) {
        this._state[key] = nextValue;
        this.publish(key);
      }
      return;
    }

    if (!isEqual(oldValue, nextValue)) {
      this._state[key] = structuredClone(nextValue);
      if (key === 'columns') {
        this._saveColumnsToStorage(this._state.columns);
      }
      this.publish(key);
    }
  }

  /**
   * widthだけをリセットしてisUsed（表示/非表示）は維持する。
   * 列の表示設定を壊さずに幅だけ初期化するユースケースのための専用メソッド。
   */
  resetColumnWidths() {
    const resetColumns = this._state.columns.map((column) => ({
      id: column.id,
      isUsed: column.isUsed,
      width: getInitialColumnWidth(column.id),
    }));
    this.setData('columns', resetColumns);
  }

  /**
   * bind/unbind（旧API）に代わる新しいコールバックベースの変化監視API。
   * Storeのキーに対して複数のコールバックを登録でき、setDataのたびに呼ばれる。
   */
  subscribe<T extends keyof StoreState>(
    key: T,
    callback: (value: StoreState[T]) => void
  ) {
    if (!this._listeners.has(key)) {
      this._listeners.set(key, new Set());
    }
    this._listeners.get(key)?.add(callback as unknown as StoreListener);
  }

  /**
   * メモリリーク防止のためコンポーネント破棄時にコールバックを解除する。
   */
  unsubscribe<T extends keyof StoreState>(
    key: T,
    callback: (value: StoreState[T]) => void
  ) {
    this._listeners.get(key)?.delete(callback as unknown as StoreListener);
  }

  /**
   * observer[key]()を呼ぶ旧来のobserverパターン。subscribeへ移行中のため将来削除予定。
   * TODO: _bindingsが廃止されたら削除する
   */
  bind<T = unknown>(key: string, target: T) {
    if (this._bindings[key] === undefined) {
      this._bindings[key] = [target];
    } else {
      this._bindings[key].push(target);
    }
  }

  /**
   * コンポーネント破棄時にbindingsから自身を外してメモリリークを防ぐ。
   * TODO: _bindingsが廃止されたら削除する
   */
  unbind<T = unknown>(key: string, target: T) {
    if (this._bindings[key]) {
      const index = this._bindings[key].indexOf(target);
      if (index !== -1) {
        this._bindings[key].splice(index, 1);
        if (this._bindings[key].length === 0) {
          delete this._bindings[key];
        }
      }
    }
  }

  /**
   * listeners（新API）とbindings（旧API）の両方に変化を通知する。
   * 2系統あるのはbind/subscribeの移行期に両APIを同時に支える必要があるため。
   */
  publish<T extends keyof StoreState>(key: T) {
    // _state の生参照を渡すとコールバック内での変更がStoreを直接汚染するため、deepCopyして渡す
    this._listeners.get(key)?.forEach((callback) =>
      callback(this._deepCopy(this._state[key]))
    );

    // TODO: _bindingsが廃止されたら削除する
    if (this._bindings[key]) {
      this._bindings[key].forEach((observer) => {
        const valueCopy = this._deepCopy(this._state[key]);
        const handler = (observer as Record<string, unknown>)[key as string];
        if (typeof handler === 'function') {
          // observer[key](...) と同等にthisをobserverに束縛して呼び出す
          (handler as (this: unknown, value: unknown) => void).call(
            observer,
            valueCopy
          );
        } else {
          console.warn(
            `This binding has no corresponding function.`,
            observer,
            key
          );
        }
      });
    }
  }

  /**
   * nullとプリミティブはstructuredCloneをスキップして早期リターンする。
   * getDataやpublish経由でStoreの値が外部から変更されないよう保護するために使う。
   */
  private _deepCopy<T>(value: T): T {
    if (value === null || typeof value !== 'object') return value;
    return structuredClone(value);
  }

  // ------------------------------
  //  検索結果の管理
  // ------------------------------

  /**
   * isStoreUpdating=trueで行の中途表示を防いでから既存データと新データをマージする。
   * スクロール中に古いデータと新データが混在して見えないよう更新を一括で行う設計にしている。
   */
  setResults(records: ResultData[], offset: number) {
    this.setData('isStoreUpdating', true);

    // numberOfRecords はプリミティブなので deepCopy コストゼロ
    const updatedResults = Array(this._state.numberOfRecords).fill(null);

    // 仮想スクロールで前後ページのデータを保持するため既存データを引き継ぐ。
    // getData() を経由すると O(n) の deepCopy が走るため、_state を直接参照して回避する。
    this._state.searchResults.forEach((record, index) => {
      if (record) updatedResults[index] = record;
    });

    records.forEach((record, index) => {
      updatedResults[offset + index] = record;
    });

    // updatedResults は常に新規構築のため isEqual チェックと structuredClone は不要。
    // setData を経由せず直接代入し、publish を一度だけ呼ぶことで二重通知を防ぐ。
    this._state.searchResults = updatedResults;
    this.publish('searchResults');

    // isFetchingはdata/statリクエスト全体の完了後にexecuteSearch側で解除するため、ここでは触らない
    this.setData('isStoreUpdating', false);
  }

  /**
   * 仮想スクロールの行がデータを要求するときに呼ばれる。
   * isStoreUpdating中は中途状態を返さないようloadingを返す。
   * recordIndexのデータがnullの場合はexecuteSearchを呼んで後続ページを取得する。
   */
  getRecordByIndex(index: number) {
    if (this.getData<boolean>('isStoreUpdating')) return 'loading';
    const recordIndex = this.getData<number>('offset') + index;

    if (recordIndex < this._state.numberOfRecords) {
      const record = this._state.searchResults[recordIndex];
      if (record) return this._deepCopy(record);
      executeSearch(this.getData<number>('offset') + index);
      return 'loading';
    }
    return 'out of range';
  }

  /**
   * パネルビューの表示対象レコードを返す。
   * deepCopyしないのは読み取り専用として扱うため（変更はsetDataを通す）。
   */
  getSelectedRecord() {
    if (this._state.selectedRow !== undefined) {
      return this._state.searchResults[
        this._state.offset + this._state.selectedRow
      ];
    } else {
      return null;
    }
  }

  // ------------------------------
  //  Login Status管理
  // ------------------------------

  /**
   * localhost環境ではCORSエラーになるため認証APIを呼ばずに未ログイン扱いにする。
   * 403もログイン済みとして扱うのは、ステージング/本番でステータスエンドポイントへの
   * アクセス権がセッションに関係なく制限される場合があるため。
   */
  async fetchLoginStatus() {
    try {
      if (typeof window === 'undefined') {
        this.setData('isLogin', false);
        return;
      }

      if (window.location.origin === 'http://localhost:8000') {
        this.setData('isLogin', false);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${window.location.origin}/auth/status`, {
        signal: controller.signal,
      }).catch(() => {
        throw new Error('Request failed or timed out');
      });

      clearTimeout(timeoutId);

      if (response instanceof Response) {
        if (response.status === 200 || response.status === 403) {
          this.setData('isLogin', true);
        } else {
          this.setData('isLogin', false);
        }
      }
    } catch (error) {
      if (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
      ) {
        console.warn('Failed to fetch auth status:', error);
      }
      this.setData('isLogin', false);
    }
  }

  // ------------------------------
  //  検索モードの管理
  // ------------------------------

  /**
   * searchModeのsubscribeコールバック。モード切替時にoffset/selectedRow/searchResultsを
   * リセットしてから再検索する。
   * ''（空文字）はStoreの初期化前センチネルのため何もしない。
   */
  searchMode(mode: SearchMode | '') {
    if (!mode) return;
    this.setData('isStoreUpdating', true);

    try {
      this.setData('offset', 0);
      this.setData('selectedRow', undefined);
      this.setData('searchResults', []);
      this.setData('numberOfRecords', 0);
      this.setData('rowCount', 0);

      if (typeof document !== 'undefined') {
        document.body.dataset.searchMode = mode;
      }

      switch (mode) {
        case 'simple':
          // _fromHistoryのときはpopstateでURLが確定済みのためpushStateしない
          if (!this._fromHistory) reflectSimpleSearchConditionToURI();
          this.publish('simpleSearchConditions');
          break;
        case 'advanced': {
          // setAdvancedSearchConditionはexecuteSearchを内包するため呼ばない。
          // _fromHistoryのときはURLも変更不要のためreflect系をスキップ。
          // 検索実行はこのメソッド末尾のexecuteSearch(0, true)に一本化する。
          if (!this._fromHistory) reflectAdvancedSearchConditionToURI();
          break;
        }
      }

      // モード切り替え時は必ず初回検索として扱う
      this.setData('appStatus', 'searching');
      executeSearch(0, true);
    } finally {
      this.setData('isStoreUpdating', false);
    }
  }

  /**
   * popstate中にsetData('searchMode')を直接呼ぶとreflect*ToURIがpushStateを発火して
   * ブラウザ履歴が壊れる。_fromHistoryフラグでURIへの反映をスキップするために別メソッドを用意した。
   * 初期ロードでも同じ理由で使う（URLは正しいのにpushStateすると履歴エントリが乱れるため）。
   */
  setSearchModeFromHistory(mode: SearchMode) {
    this._fromHistory = true;
    try {
      this.setData('searchMode', mode);
    } finally {
      this._fromHistory = false;
    }
  }
}

export const storeManager = new StoreManager();
