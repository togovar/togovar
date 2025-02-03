import {
  _handleHistoryChange,
  _reflectSimpleSearchConditionToURI,
  setAdvancedSearchCondition,
} from '../store/searchManager.js';
import { executeSearch } from '../api/fetchData.js';

// class StoreManager extends FormatData {
class StoreManager {
  constructor() {
    window.__s = this; // set global variable for monitering
    this._bindings = {};
    this._store = {
      searchResults: [],
      numberOfRecords: 0,
      offset: 0,
      rowCount: 0,
      appStatus: 'preparing',
      isFetching: false,
      isLogin: false,
      isUpdating: false,
    };

    this.initSearchCondition();
  }

  initSearchCondition() {
    // this._isReady = false;
    this.setData('isFetching', false);
    // events
    window.addEventListener('popstate', _handleHistoryChange.bind(this));
    this.bind('searchMode', this);
  }

  getData(key) {
    return this._copy(this._store[key]);
  }

  /** 検索結果を保存し、状態を更新する
   * @param {Array} records - 取得した検索結果データの配列
   * @param {Number} offset - 追加する検索結果の開始位置 */
  setResults(records, offset) {
    try {
      this._store.isUpdating = true;

      // 新しい配列を作成して更新
      const updatedResults = Array(this._store.numberOfRecords).fill(null);

      // 既存のデータをコピー
      this._store.searchResults.forEach((record, index) => {
        if (record) {
          updatedResults[index] = record;
        }
      });

      // 新しいデータを追加
      records?.forEach((record, index) => {
        updatedResults[offset + index] = record;
      });

      this._store.searchResults = updatedResults;
      this.notify('searchResults');
    } finally {
      this._store.isUpdating = false;
      this.setData('isFetching', false);
    }
  }

  /** 指定されたインデックスのレコードを取得
   * レコードが存在しない場合は検索を実行し、ステータスを 'loading' に設定します。
   * @param {number} index - 取得するレコードのインデックス
   * @returns {*} - レコードのコピー、'loading' または 'out of range' */
  getRecordByIndex(index) {
    const recordIndex = this._store.offset + index;

    if (this._store.isUpdating) {
      return 'loading';
    }

    if (recordIndex < this._store.numberOfRecords) {
      const record = this._store.searchResults[recordIndex];
      if (record) {
        return this._copy(record);
      } else {
        executeSearch(this._store.offset + index);
        return 'loading';
      }
    }
    return 'out of range';
  }

  // どのPanelViewが呼ばれるかを判定するための関数
  getSelectedRecord() {
    if (this._store.selectedRow !== undefined) {
      return this._store.searchResults[
        this._store.offset + this._store.selectedRow
      ];
    } else {
      return null;
    }
  }

  /** 指定されたキーにデータをセットする
   * @param {string} key - データを保存するキー
   * @param {*} newValue - 保存するデータ  */
  setData(key, newValue) {
    // 当該データを持っていないか、当該データが不一致であれば、データをセット
    const isUndefined = this._store[key] === undefined;

    // データが変更されたか確認
    const isMutated =
      typeof newValue === 'object'
        ? JSON.stringify(this._store[key]) !== JSON.stringify(newValue)
        : this._store[key] != newValue;

    // データが存在しないか変更されている場合にのみセット
    if (isUndefined || isMutated) {
      this._store[key] = this._copy(newValue);
      this.notify(key);
    }
  }

  async fetchLoginStatus() {
    try {
      if (window.location.origin === 'http://localhost:8000') {
        this.setData('isLogin', true);
        return;
      }

      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const fetchPromise = fetch(`${window.location.origin}/auth/status`);

      const response = await Promise.race([fetchPromise, timeout]);

      if (response.status === 401 || response.status === 403) {
        this.setData('isLogin', false);
      } else if (response.status === 200) {
        this.setData('isLogin', true);
      }
    } catch (error) {
      console.error('Error fetching auth status or timeout occurred:', error);
      this.setData('isLogin', false);
    }
  }

  /** 指定されたキーにターゲットをバインドする
   * @param {string} key - データ変更を監視するキー
   * @param {Object} target - キー変更時に通知を受け取るオブジェクト */
  bind(key, target) {
    if (this._bindings[key] === undefined) {
      // 初めてのバインディングなら新しい配列を作成
      this._bindings[key] = [target];
    } else {
      // すでにバインドされている場合は追加
      this._bindings[key].push(target);
    }
  }

  /**  指定されたキーに関連するすべてのオブジェクトに変更を通知する
   * @param {string} key - 変更が発生したデータのキー */
  notify(key) {
    if (this._bindings[key]) {
      this._bindings[key].forEach((observer) => {
        const valueCopy = this._copy(this._store[key]);
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

  /** Deep copy the provided value.
   * @param {*} value - The value to copy.
   * @returns {*} - The copied value. */
  _copy(value) {
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
    this._store.isUpdating = true; // 更新中フラグを立てて不要な描画を防ぐ
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
          _reflectSimpleSearchConditionToURI();
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
      this._store.isUpdating = false;
    }
  }
}

export default new StoreManager();
