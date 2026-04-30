import * as _ from 'lodash';
import {
  handleHistoryChange,
  reflectSimpleSearchConditionToURI,
  reflectAdvancedSearchConditionToURI,
  setAdvancedSearchCondition,
} from '../store/searchManager';
import { executeSearch } from '../api/fetchData';
import { getDefaultColumnConfigs, normalizeColumnConfigs } from '../global';
import type { StoreState, ResultData, SearchMode } from '../types';

const COLUMNS_STORAGE_KEY = 'columns';

type StoreListener = (value: unknown) => void;

// 旧実装（FormatData 継承版）
class StoreManager {
  #bindings: Record<string, unknown[]> = {}; // TODO: いずれ削除
  #listeners = new Map<string, Set<StoreListener>>();
  #state: StoreState = {
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

  constructor() {
    this.#initColumnsState();
    this.#initSearchCondition();
  }

  /** 列設定（columns）を初期化 */
  #initColumnsState() {
    this.#state.columns = this.#loadColumnsFromStorage();
  }

  /** localStorage から列設定を復元 */
  #loadColumnsFromStorage() {
    const fallbackColumns = getDefaultColumnConfigs();

    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return fallbackColumns;
      }

      const raw = window.localStorage.getItem(COLUMNS_STORAGE_KEY);
      if (!raw) {
        return fallbackColumns;
      }

      const columns = this.#parseStoredColumns(raw);
      if (!columns) {
        return fallbackColumns;
      }

      return columns;
    } catch (_error) {
      return fallbackColumns;
    }
  }

  /** localStorage に保存された列設定文字列を検証・正規化 */
  #parseStoredColumns(raw: string): StoreState['columns'] | null {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }

    return normalizeColumnConfigs(parsed);
  }

  /** 列設定を localStorage に保存 */
  #saveColumnsToStorage(columns: StoreState['columns']) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }

      const normalizedColumns = normalizeColumnConfigs(columns);
      window.localStorage.setItem(
        COLUMNS_STORAGE_KEY,
        JSON.stringify(normalizedColumns)
      );
    } catch (_error) {
      // localStorage 制限超過やプライベートブラウズ環境では保存失敗を許容
    }
  }

  /** 検索条件まわりの初期イベントを登録 */
  #initSearchCondition() {
    this.setData('isFetching', false);
    // イベント登録
    window.addEventListener('popstate', handleHistoryChange.bind(this));
    this.subscribe('searchMode', this.searchMode.bind(this));
  }

  /** 指定されたキーからデータを取得する */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getData<T = any>(key: keyof StoreState): T {
    return this._deepCopy(this.#state[key]);
  }

  /** 指定されたキーにデータをセットする */
  setData<T extends keyof StoreState>(key: T, newValue: StoreState[T]) {
    const oldValue = this.#state[key];
    // 値がプリミティブ型ならそのまま比較
    if (typeof newValue !== 'object' || newValue === null) {
      if (!Object.is(oldValue, newValue)) {
        this.#state[key] = newValue;
        if (key === 'columns') {
          this.#saveColumnsToStorage(this.#state.columns);
        }
        this.publish(key);
      }
      return;
    }

    // オブジェクトの比較（変更があればコピーして保存）
    if (!_.isEqual(oldValue, newValue)) {
      this.#state[key] = structuredClone(newValue);
      if (key === 'columns') {
        this.#saveColumnsToStorage(this.#state.columns);
      }
      this.publish(key);
    }
  }

  /** 変更監視を追加する
   * callback が実行されると、UI が更新される */
  subscribe<T extends keyof StoreState>(
    key: T,
    callback: (value: StoreState[T]) => void
  ) {
    if (!this.#listeners.has(key)) {
      this.#listeners.set(key, new Set());
    }
    this.#listeners.get(key)?.add(callback as unknown as StoreListener);
  }

  /** 変更監視を解除する */
  unsubscribe<T extends keyof StoreState>(
    key: T,
    callback: (value: StoreState[T]) => void
  ) {
    this.#listeners.get(key)?.delete(callback as unknown as StoreListener);
  }

  /** 指定されたキーにターゲットをバインドする */
  // TODO: bindings が廃止されたら、このメソッドは削除する
  bind<T = unknown>(key: string, target: T) {
    if (this.#bindings[key] === undefined) {
      // 初めてのバインディングなら新しい配列を作成
      this.#bindings[key] = [target];
    } else {
      // すでにバインドされている場合は追加
      this.#bindings[key].push(target);
    }
  }

  /** 指定されたキーからターゲットをアンバインドする */
  // TODO: bindings が廃止されたら、このメソッドは削除する
  unbind<T = unknown>(key: string, target: T) {
    if (this.#bindings[key]) {
      const index = this.#bindings[key].indexOf(target);
      if (index !== -1) {
        this.#bindings[key].splice(index, 1);
        // 配列が空になったら削除
        if (this.#bindings[key].length === 0) {
          delete this.#bindings[key];
        }
      }
    }
  }

  /** listenersに登録されている関数を実行 */
  publish<T extends keyof StoreState>(key: T) {
    this.#listeners.get(key)?.forEach((callback) => callback(this.#state[key]));

    // TODO: bindings が廃止されたら、このブロックは削除する
    if (this.#bindings[key]) {
      this.#bindings[key].forEach((observer) => {
        const valueCopy = this._deepCopy(this.#state[key]);
        const handler = (observer as Record<string, unknown>)[key as string];
        if (typeof handler === 'function') {
          // observer[key](...) と同等に this を observer に束縛して呼び出す
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

  /** 値をディープコピーして返す */
  _deepCopy<T>(value: T): T {
    if (value === null || typeof value !== 'object') return value;
    return structuredClone(value);
  }

  // ------------------------------
  //  検索結果の管理
  // ------------------------------
  /** 検索結果を保存し、状態を更新する */
  setResults(records: ResultData[], offset: number) {
    // 更新中フラグを立てる
    this.setData('isStoreUpdating', true);

    const updatedResults = Array(this.getData<number>('numberOfRecords')).fill(
      null
    );

    // 既存データと新データの更新
    this.getData<ResultData[]>('searchResults').forEach(
      (record: ResultData | null, index: number) => {
        if (record) {
          updatedResults[index] = record;
        }
      }
    );

    records.forEach((record: ResultData, index: number) => {
      updatedResults[offset + index] = record;
    });

    // 更新順序の変更とログ追加
    this.setData('searchResults', updatedResults);

    this.publish('searchResults');

    this.setData('isFetching', false);

    this.setData('isStoreUpdating', false);
  }

  /** 指定されたインデックスのレコードを取得
   * レコードが存在しない場合は検索を実行し、ステータスを 'loading' に設定 */
  getRecordByIndex(index: number) {
    if (this.getData<boolean>('isStoreUpdating')) return 'loading';
    const recordIndex = this.getData<number>('offset') + index;

    if (recordIndex < this.#state.numberOfRecords) {
      const record = this.#state.searchResults[recordIndex];
      if (record) return this._deepCopy(record);
      executeSearch(this.getData<number>('offset') + index);
      return 'loading';
    }
    return 'out of range';
  }

  // どのPanelViewが呼ばれるかを判定するための関数
  getSelectedRecord() {
    if (this.#state.selectedRow !== undefined) {
      return this.#state.searchResults[
        this.#state.offset + this.#state.selectedRow
      ];
    } else {
      return null;
    }
  }

  // ------------------------------
  //  Login Status管理
  // ------------------------------
  /** ログイン状態を取得してストアに反映 */
  async fetchLoginStatus() {
    try {
      // localhost 開発時は常に未ログイン扱いにして認証チェックをスキップ
      if (window.location.origin === 'http://localhost:8000') {
        this.setData('isLogin', false);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 秒でタイムアウト

      const response = await fetch(`${window.location.origin}/auth/status`, {
        signal: controller.signal,
      }).catch(() => {
        throw new Error('Request failed or timed out');
      });

      clearTimeout(timeoutId);

      if (response instanceof Response) {
        if (response.status === 200) {
          this.setData('isLogin', true);
        } else {
          console.warn(`Not logged in: status=${response.status}`);
        }
      }
    } catch (error) {
      console.error('Failed to fetch auth status:', error);
      this.setData('isLogin', false);
    }
  }

  // ------------------------------
  //  検索モードの管理
  // ------------------------------
  /** 検索モードを変更 */
  searchMode(mode: SearchMode) {
    this.setData('isStoreUpdating', true);

    try {
      this.setData('offset', 0);
      this.setData('selectedRow', undefined);
      this.setData('searchResults', []);
      this.setData('numberOfRecords', 0);
      this.setData('rowCount', 0);

      document.body.dataset.searchMode = mode;

      switch (mode) {
        case 'simple':
          reflectSimpleSearchConditionToURI();
          this.publish('simpleSearchConditions');
          break;
        case 'advanced': {
          const condition = this.getData('advancedSearchConditions');
          setAdvancedSearchCondition(condition);
          reflectAdvancedSearchConditionToURI();
          break;
        }
      }

      // 検索を開始（モード切り替え時は必ず初回検索として扱う）
      this.setData('appStatus', 'searching');
      executeSearch(0, true);
    } finally {
      this.setData('isStoreUpdating', false);
    }
  }
}

export const storeManager = new StoreManager();
