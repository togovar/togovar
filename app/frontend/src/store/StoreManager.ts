import {
  handleHistoryChange,
  reflectSimpleSearchConditionToURI,
  setAdvancedSearchCondition,
} from '../store/searchManager';
import { executeSearch } from '../api/fetchData';
import { ResultData } from '../types';

// class StoreManager extends FormatData {
class StoreManager {
  #bindings: Record<string, any[]> = {};
  #store: {
    searchResults: any[];
    numberOfRecords: number;
    offset: number;
    rowCount: number;
    appStatus: string;
    isLogin: boolean;
    isFetching: boolean;
    isStoreUpdating: boolean;
    selectedRow?: number;
    lastSearchMode?: string;
    advancedSearchConditions?: any;
  } = {
    searchResults: [],
    numberOfRecords: 0,
    offset: 0,
    rowCount: 0,
    appStatus: 'preparing',
    isLogin: false,
    isFetching: false,
    isStoreUpdating: false,
  };

  constructor() {
    this.initSearchCondition();
  }

  initSearchCondition() {
    // this._isReady = false;
    this.setData('isFetching', false);
    // events
    window.addEventListener('popstate', handleHistoryChange.bind(this));
    this.bind('searchMode', this);
  }

  /** 指定されたキーからデータを取得する */
  getData<T = any>(key: string): T {
    return this._copy(this.#store[key]);
  }

  /** 指定されたキーにデータをセットする */
  setData<T = any>(key: string, newValue: T) {
    // 当該データを持っていないか、当該データが不一致であれば、データをセット
    const isUndefined = this.#store[key] === undefined;

    // データが変更されたか確認
    const isMutated =
      typeof newValue === 'object'
        ? JSON.stringify(this.#store[key]) !== JSON.stringify(newValue)
        : this.#store[key] != newValue;

    // データが存在しないか変更されている場合にのみセット
    if (isUndefined || isMutated) {
      this.#store[key] = this._copy(newValue);
      this.notify(key);
    }
  }

  /** 検索結果を保存し、状態を更新する */
  setResults(records: ResultData[], offset: number) {
    try {
      this.#store.isStoreUpdating = true;

      // 新しい配列を作成して更新
      const updatedResults = Array(this.#store.numberOfRecords).fill(null);

      // 既存のデータをコピー
      this.#store.searchResults.forEach((record, index) => {
        if (record) {
          updatedResults[index] = record;
        }
      });

      // 新しいデータを追加
      records?.forEach((record, index) => {
        updatedResults[offset + index] = record;
      });

      this.#store.searchResults = updatedResults;
      this.notify('searchResults');
    } finally {
      this.#store.isStoreUpdating = false;
      this.setData('isFetching', false);
    }
  }

  /** 指定されたインデックスのレコードを取得
   * レコードが存在しない場合は検索を実行し、ステータスを 'loading' に設定 */
  getRecordByIndex(index: number) {
    const recordIndex = this.#store.offset + index;

    if (this.#store.isStoreUpdating) {
      return 'loading';
    }

    if (recordIndex < this.#store.numberOfRecords) {
      const record = this.#store.searchResults[recordIndex];
      if (record) {
        return this._copy(record);
      } else {
        executeSearch(this.#store.offset + index);
        return 'loading';
      }
    }
    return 'out of range';
  }

  // どのPanelViewが呼ばれるかを判定するための関数
  getSelectedRecord() {
    if (this.#store.selectedRow !== undefined) {
      return this.#store.searchResults[
        this.#store.offset + this.#store.selectedRow
      ];
    } else {
      return null;
    }
  }

  async fetchLoginStatus() {
    try {
      if (window.location.origin === 'http://localhost:8000') {
        this.setData('isLogin', true);
        return;
      }

      const timeout = new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const fetchPromise = fetch(`${window.location.origin}/auth/status`);
      const response = await Promise.race([fetchPromise, timeout]);

      if (response instanceof Response) {
        if (response.status === 401 || response.status === 403) {
          this.setData('isLogin', false);
        } else if (response.status === 200) {
          this.setData('isLogin', true);
        }
      } else {
        throw new Error('Invalid response type');
      }
    } catch (error) {
      console.error('Error fetching auth status or timeout occurred:', error);
      this.setData('isLogin', false);
    }
  }

  /** 指定されたキーにターゲットをバインドする */
  bind<T = any>(key: string, target: T) {
    if (this.#bindings[key] === undefined) {
      // 初めてのバインディングなら新しい配列を作成
      this.#bindings[key] = [target];
    } else {
      // すでにバインドされている場合は追加
      this.#bindings[key].push(target);
    }
  }

  /**  指定されたキーに関連するすべてのオブジェクトに変更を通知する */
  notify(key: string) {
    if (this.#bindings[key]) {
      this.#bindings[key].forEach((observer) => {
        const valueCopy = this._copy(this.#store[key]);
        if (typeof observer[key] === 'function') {
          observer[key](valueCopy);
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

  /** Deep copy the provided value */
  _copy<T>(value: T): T {
    switch (true) {
      case Array.isArray(value):
        return JSON.parse(JSON.stringify(value));
      case typeof value === 'object':
        return Object.assign({}, value);
      default:
        return value;
    }
  }

  // Bindings *******************************************
  /** 検索モードを変更する
   * @param {string} mode - 'simple' または 'advanced' */
  searchMode(mode) {
    // 変更前の検索モードと異なる場合のみ処理
    if (this.getData('lastSearchMode') === mode) return;

    // 検索モードを更新
    this.setData('lastSearchMode', mode);

    // 検索モード切り替え時にリセット
    this.#store.isStoreUpdating = true; // 更新中フラグを立てて不要な描画を防ぐ
    try {
      this.setData('offset', 0);
      this.setData('selectedRow', undefined);
      this.setData('searchResults', []);
      this.setData('numberOfRecords', 0);
      this.setData('rowCount', 0); // 行数もリセット

      // body に `data-search-mode` を追加（CSS や UI の変更用）
      document.body.dataset.searchMode = mode;

      switch (mode) {
        case 'simple':
          reflectSimpleSearchConditionToURI();
          this.notify('simpleSearchConditions');
          break;
        case 'advanced':
          {
            const condition = this.getData('advancedSearchConditions');
            setAdvancedSearchCondition(condition);
          }
          break;
      }

      // 検索を開始（モード切り替え時は必ず初回検索として扱う）
      this.setData('appStatus', 'searching');
      executeSearch(0, true);
    } finally {
      this.#store.isStoreUpdating = false;
    }
  }
}

export default new StoreManager();
