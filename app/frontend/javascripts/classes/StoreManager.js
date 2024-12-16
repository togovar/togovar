import { mixin } from './StoreManagerMixin.js';

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
      isLogin: false,
      _abortController: new AbortController(),
    };

    this.initSearchCondition();
  }

  getData(key) {
    return this._copy(this._store[key]);
  }

  getSelectedRecord() {
    if (this._store.selectedRow !== undefined) {
      return this._store.searchResults[
        this._store.offset + this._store.selectedRow
      ];
    } else {
      return null;
    }
  }

  getRecordByIndex(index) {
    if (this._store.offset + index < this._store.numberOfRecords) {
      const record = this._store.searchResults[this._store.offset + index];
      if (record) {
        return this._copy(record);
      } else {
        // 取得できていないレコードの取得
        this._search(this._store.offset + index);
        this.setData('appStatus', 'loading');
        return 'loading';
      }
    } else {
      return 'out of range';
    }
  }

  setData(key, value) {
    // 当該データを持っていないか、当該データが不一致であれば、データをセット
    const isUndefined = this._store[key] === undefined,
      isMutated =
        typeof value === 'object'
          ? JSON.stringify(this._store[key]) !== JSON.stringify(value)
          : this._store[key] != value;
    if (isUndefined || isMutated) {
      this._store[key] = this._copy(value);
      this._notify(key);
    }
    // 個別の処理
  }

  async fetchLoginStatus() {
    try {
      if (window.location.origin === 'http://localhost:8000') {
        this.setData('isLogin', true);
        return
      }
      const response = await fetch(`${window.location.origin}/auth/status`);

      if (response.status === 401) {
        this.setData('isLogin', false);
      } else if (response.status === 200 || response.status === 403) {
        this.setData('isLogin', true);
      }
      return
    } catch (error) {
      console.error('Error fetching auth status:', error);
    }
  }

  // store search results
  _setResults(records, offset) {
    for (let i = 0; i < records.length; i++) {
      this._store.searchResults[offset + i] = records[i];
    }
    this._notify('searchResults');
    this._fetching = false;
  }

  // notify bound objects
  // used in 'setData()' or directory
  _notify(key) {
    if (this._bindings[key]) {
      for (const watcher of this._bindings[key]) {
        let value = this._store[key];
        const copy = this._copy(value);
        if (typeof watcher[key] === 'function') {
          watcher[key](copy);
        } else {
          console.warn(
            `This binding has no corresponding function.`,
            watcher,
            key
          );
        }
      }
    }
  }

  bind(key, target) {
    if (this._bindings[key] === undefined) {
      this._bindings[key] = [target];
    } else {
      this._bindings[key].push(target);
    }
  }

  _copy(value) {
    switch (
    true // 値渡し
    ) {
      case Array.isArray(value):
        return JSON.parse(JSON.stringify(value));
      case typeof value === 'object':
        return Object.assign({}, value);
      default:
        return value;
    }
  }
}

Object.assign(StoreManager.prototype, mixin);

export default new StoreManager();
