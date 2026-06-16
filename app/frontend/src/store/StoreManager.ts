import isEqual from 'lodash/isEqual';
import { executeSearch } from '../api/fetchData';
import { getInitialColumnWidth, normalizeColumnConfigs } from '../columns';
import {
  loadColumnsFromStorage,
  saveColumnsToStorage,
} from '../columns/columnStorage';
import type { StoreState, ResultData, SearchMode } from '../types';

type StoreListener = (value: unknown) => void;

/**
 * アプリ全体の状態を一元管理するシングルトンStore。
 * subscribe/publish によるオブザーバーパターンで状態変化をUIコンポーネントへ伝える。
 */
class StoreManager {
  /**
   * subscribeで登録されたコールバックのMap。
   * キーはStoreStateのキー名で、値の変化があるたびに対応するSetの全コールバックを呼ぶ。
   */
  private _listeners = new Map<keyof StoreState, Set<StoreListener>>();

  /**
   * popstate経由のモード切替時にreflect*ToURIをスキップするためのフラグ。
   * setSearchModeFromHistoryとsearchModeの組み合わせでpushState二重発火を防ぐ。
   * searchManager の subscriber が fromHistory getter 経由で読む。
   */
  private _fromHistory = false;

  /** searchManager の searchMode subscriber が URL 更新をスキップするか判定するために公開する。 */
  get fromHistory(): boolean {
    return this._fromHistory;
  }

  /**
   * アプリ全体の状態オブジェクト。外部からはgetData/setDataのみを通じてアクセスする。
   */
  private _state: StoreState = {
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

  constructor() {
    this._state.columns = loadColumnsFromStorage();
    this._setupSearchModeSubscriber();
  }

  /**
   * searchMode 変化時に状態リセットを行う内部 subscriber を登録する。
   * DOM/URL/API 側の副作用は searchManager.initSearchHandlers() で別途登録する。
   */
  private _setupSearchModeSubscriber() {
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
        saveColumnsToStorage(this._state.columns);
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
   * Storeのキーに対してコールバックを登録する。
   * setData / publish のたびに登録済みの全コールバックが呼ばれる。
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
   * _state の生参照を渡すとコールバック内での変更がStoreを直接汚染するため、deepCopyして渡す。
   */
  publish<T extends keyof StoreState>(key: T) {
    this._listeners.get(key)?.forEach((callback) =>
      callback(this._deepCopy(this._state[key]))
    );
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
  getRecordByIndex(index: number): ResultData | 'loading' | 'out of range' {
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
  //  検索モードの管理
  // ------------------------------

  /**
   * searchMode 変化時に状態をリセットする subscriber。
   * DOM操作・URL管理・API呼び出しは searchManager の subscriber が担う（責務分離）。
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
