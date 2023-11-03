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

  // 検索結果は、特殊であるため専用メソッドを用意
  /**
   *
   * @param {object} records
   * @param {object[]} records.data
   * @param {object} records.scroll
   * @param {number} records.scroll.offset
   * @param {number} records.scroll.limit
   * @param {number} records.scroll.max_rows
   * @param {object} records.statistics
   * @param {object} records.statistics.consequence
   * @param {number} records.statistics.consequence.SO_0001567
   * @param {number} records.statistics.consequence.SO_0001574
   * @param {number} records.statistics.consequence.SO_0001575
   * @param {number} records.statistics.consequence.SO_0001578
   * @param {number} records.statistics.consequence.SO_0001580
   * @param {number} records.statistics.consequence.SO_0001583
   * @param {number} records.statistics.consequence.SO_0001587
   * @param {number} records.statistics.consequence.SO_0001589
   * @param {number} records.statistics.consequence.SO_0001619
   * @param {number} records.statistics.consequence.SO_0001620
   * @param {number} records.statistics.consequence.SO_0001621
   * @param {number} records.statistics.consequence.SO_0001623
   * @param {number} records.statistics.consequence.SO_0001624
   * @param {number} records.statistics.consequence.SO_0001626
   * @param {number} records.statistics.consequence.SO_0001627
   * @param {number} records.statistics.consequence.SO_0001628
   * @param {number} records.statistics.consequence.SO_0001630
   * @param {number} records.statistics.consequence.SO_0001782
   * @param {number} records.statistics.consequence.SO_0001792
   * @param {number} records.statistics.consequence.SO_0001818
   * @param {number} records.statistics.consequence.SO_0001822
   * @param {number} records.statistics.consequence.SO_0001892
   * @param {number} records.statistics.consequence.SO_0001893
   * @param {number} records.statistics.consequence.SO_0001895
   * @param {number} records.statistics.consequence.SO_0002012
   * @param {number} records.statistics.consequence.SO_0002019
   * @param {object} records.statistics.dataset
   * @param {number} records.statistics.filtered
   * @param {object} records.statistics.significance
   * @param {number} records.statistics.significance.A
   * @param {number} records.statistics.significance.AF
   * @param {number} records.statistics.significance.AN
   * @param {number} records.statistics.significance.B
   * @param {number} records.statistics.significance.CI
   * @param {number} records.statistics.significance.DR
   * @param {number} records.statistics.significance.LB
   * @param {number} records.statistics.significance.LP
   * @param {number} records.statistics.significance.NC
   * @param {number} records.statistics.significance.NP
   * @param {number} records.statistics.significance.O
   * @param {number} records.statistics.significance.P
   * @param {number} records.statistics.significance.PR
   * @param {number} records.statistics.significance.RF
   * @param {number} records.statistics.significance.US
   * @param {number} records.statistics.significance.US
   * @param {number} records.statistics.total
   * @param {object} records.statistics.type
   * @param {number} records.statistics.type.SO_0000159
   * @param {number} records.statistics.type.SO_0000667
   * @param {number} records.statistics.type.SO_0001483
   * @param {number} records.statistics.type.SO_1000002
   * @param {number} records.statistics.type.SO_1000032
   * @param {number} offset
   *
   */
  _setResults(records, offset) {
    console.log(records, offset);
    // オフセット位置に結果をセット
    for (let i = 0; i < records.length; i++) {
      this._store.searchResults[offset + i] = records[i];
    }
    this._notify('searchResults');
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
