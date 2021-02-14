/*global $ */
import {API_URL} from "../global.js";

const LIMIT = 100;

class StoreManager {

  constructor() {
    this._isReady = false;
    this._URIParameters = $.deparam(window.location.search.substr(1));
    this._bindings = {};
    this._fetching = false;
    this._store = {
      searchResults: [],
      numberOfRecords: 0,
      offset: 0,
      rowCount: 0,
      appStatus: 'preparing'
    };
    // events
    window.addEventListener('popstate', this._popstate.bind(this));
  }

  ready(callback) {
    const json = require('../../assets/search_conditions.json');
    // 検索条件のマスターデータ
    Object.freeze(json);
    this.setData('searchConditionsMaster', json);
    // 検索条件定義
    this._store.searchConditions = this._extractSearchCondition(this._URIParameters);
    this._store.advancedSearchConditions = {};
    callback();
    this._isReady = true;
    // 初回の検索結果取得
    this._search(0);
  }

  getData(key) {
    return this._copy(this._store[key]);
  }

  getSelectedRecord() {
    if (this._store.selectedRow !== undefined) {
      return this._store.searchResults[this._store.offset + this._store.selectedRow];
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
    const
      isUndefined = this._store[key] === undefined,
      isMutated = typeof value === 'object' ?
        JSON.stringify(this._store[key]) !== JSON.stringify(value) :
        this._store[key] != value;
    if (isUndefined || isMutated) {
      this._store[key] = this._copy(value);
      this._notify(key);
    }
  }

  // 検索結果は、特殊であるため専用メソッドを用意
  setResults(records, offset) {
    // オフセット位置に結果をセット
    for (let i = 0; i < records.length; i++) {
      this._store.searchResults[offset + i] = records[i];
    }
    // 通知
    this._notify('searchResults');
  }

  _notify(key) {
    // 通知
    // console.log(key)
    if (this._bindings[key]) {
      for (const watcher of this._bindings[key]) {
        // console.log(this._store)
        let value = this._store[key];
        // console.log(value)
        const copy = this._copy(value);
        // console.log(copy)
        watcher[key](copy);
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
    switch (true) { // 値渡し
      case Array.isArray(value):
        //return $.extend(true, {}, value);
        return JSON.parse(JSON.stringify(value));
      case typeof value === 'object':
        return Object.assign({}, value);
      default:
        return value;
    }
  }

  // 検索条件 *******************************************
  
  // 検索条件は、特殊であるため専用メソッドを用意
  setSearchCondition(key, values) {
    this._setSearchConditions({[key]: values});
  }
  setAdvancedSearchCondition(key, values) {
    console.log(key, values)
    // console.log(this._store)
    // console.log(this._store.advancedSearchConditions)
    this._store.advancedSearchConditions[key] = values;
    // URIパラメータに反映 TODO:
    // if (!fromHistory) this._reflectSearchConditionToURI();
    // 検索条件として成立していれば、検索開始
    if (!this._isReady) return;

    if (this._fetching === true) return;
    // extract diff
    const conditions = this._extractAdvancedSearchCondition(key, values);
    if (conditions.length === 0) return;

    // リセット
    this.setData('numberOfRecords', 0);
    this.setData('offset', 0);
    this.setData('rowCount', 0);
    this._store.searchResults = [];
    this.setResults([], 0);
    // 通知
    this._notify('advancedSearchConditions');
    // 検索
    this.setData('appStatus', 'searching');
    this._fetching = true;
    let path = `${API_URL}/api/search/variation`;
    fetch(path, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        query: {
          or: conditions
        }
      })
    })
    .then(response => response.json())
    .then(json => {
      console.log(json)
      // status
      this.setData('searchStatus', {
        available: Math.min(json.statistics.filtered, json.scroll.max_rows),
        filtered: json.statistics.filtered,
        total: json.statistics.total
      });

      // results
      this.setData('numberOfRecords', this.getData('searchStatus').available);
      this.setResults(json.data, json.scroll.offset);

      // statistics
      // dataset
      this.setData('statisticsDataset', json.statistics.dataset);
      // significance
      this.setData('statisticsSignificance', json.statistics.significance);
      // total_variant_type
      this.setData('statisticsType', json.statistics.type);
      // consequence
      this.setData('statisticsConsequence', json.statistics.consequence);

      this.setData('searchMessages', {
        error: json.error,
        warning: json.warning,
        notice: json.notice
      });

      this._fetching = false;
      this._notify('offset');
      this.setData('appStatus', 'normal');
      console.log(this)

    })
  }

  _setSearchConditions(conditions, fromHistory) {
    for (const conditionKey in conditions) {
      this._store.searchConditions[conditionKey] = conditions[conditionKey];
    }
    // URIパラメータに反映
    if (!fromHistory) this._reflectSearchConditionToURI();
    // 検索条件として成立していれば、検索開始
    if (this._isReady) {
      // リセット
      this.setData('numberOfRecords', 0);
      this.setData('offset', 0);
      this.setData('rowCount', 0);
      this._store.searchResults = [];
      this.setResults([], 0);
      // 通知
      this._notify('searchConditions');
      // 検索
      this.setData('appStatus', 'searching');
      this._search(0);
    }
  }

  resetSearchConditions() {
    const searchConditionsMaster = this.getData('searchConditionsMaster'), resetConditions = {};
    for (const condition of searchConditionsMaster) {
      switch (condition.type) {
        case 'string':
        case 'boolean':
          if (condition.id !== 'term') resetConditions[condition.id] = condition.default;
          break;
        case 'array': {
          const temp = {};
          for (const item of condition.items) {
            temp[item.id] = item.default;
          }
          resetConditions[condition.id] = temp;
        }
          break;
      }
    }
    this._setSearchConditions(resetConditions);
  }

  getSearchCondition(key) {
    return this._copy(this._store.searchConditions[key]);
  }

  getSearchConditionMaster(key) {
    return this.getData('searchConditionsMaster').find(condition => condition.id === key);
  }

  // デフォルト値と異なる検索条件を抽出
  _extractSearchCondition(condition) {
    const searchConditionsMaster = this.getData('searchConditionsMaster');
    // extract diff
    const diffConditions = {};
    for (let conditionKey in condition) {
      const conditionMaster = searchConditionsMaster.find(condition => condition.id === conditionKey);
      if (conditionMaster) {
        switch (conditionMaster.type) {
          case 'array': {
            const filtered = {};
            for (const item in condition[conditionKey]) {
              if (condition[conditionKey][item] !== conditionMaster.items.find(condition => condition.id === item).default) {
                filtered[item] = condition[conditionKey][item];
              }
            }
            if (Object.keys(filtered).length > 0) {
              diffConditions[conditionKey] = filtered;
            }
          }
            break;
          case 'boolean':
          case 'string': {
            if (condition[conditionKey] !== conditionMaster.default) {
              diffConditions[conditionKey] = condition[conditionKey];
            }
          }
            break;
        }
      }
    }
    return diffConditions;
  }

  _extractAdvancedSearchCondition(key, values) {
    console.log(key, values)
    const searchConditionsMaster = this.getData('searchConditionsMaster');
    const conditionMaster = searchConditionsMaster.find(condition => condition.id === key)
    console.log(conditionMaster)
    const diffConditions = [];
    for (const dataset in values) {
      const datasetDefault = conditionMaster.items.find(item => item.id === dataset).default;
      console.log(datasetDefault)
      if ( Object.keys(values[dataset].frequency).some(key_ => datasetDefault.frequency[key_] === undefined || datasetDefault.frequency[key_] !== values[dataset].frequency[key_]) ) {
        console.log(diffConditions)
        diffConditions.push({
          frequency: {
            dataset: {
              name: dataset
            },
            frequency: values[dataset].frequency
          }
        })
      }
    }
    console.log(diffConditions)
    return {[key]: diffConditions};
  }

  // URIパラメータをアドレスバーに反映
  _reflectSearchConditionToURI() {
    console.log( this._searchMode )
    const master = this.getData('searchConditionsMaster');
    const diffConditions = this._extractSearchCondition(this._store.searchConditions);
    // 一旦パラメータ削除
    for (const condition of master) {
      delete this._URIParameters[condition.id];
    }
    // パラメータの合成
    Object.assign(this._URIParameters, diffConditions);
    // URIパラメータに反映
    window.history.pushState(this._URIParameters, '', `${window.location.origin}${window.location.pathname}?${$.param(this._URIParameters)}`);
  }

  // ヒストリーが変更されたら、URL変数を取得し検索条件を更新
  _popstate(e) {
    const URIParameters = $.deparam(window.location.search.substr(1));
    this._setSearchConditions(URIParameters, true);
  }


  // 検索 *******************************************
  _search(offset) {
    if (this._fetching === true) {
      // 検索中であれば実行せず
      return;
    }
    const lastConditions = JSON.stringify(this._store.searchConditions);
    this._fetching = true;
    let path;
    if (this._URIParameters.path === 'local') {
      if (offset === 0) {
        path = 'results.json';
      }
    } else {
      path = `${API_URL}/search?offset=${offset - offset % LIMIT}&${$.param(this._extractSearchCondition(this._store.searchConditions))}`;
    }
    fetch(path, {
      headers: {
        'Accept': 'application/json'
      }
    })
      .catch(e => {
        throw Error(e);
      })
      .then(response => {
        if (response.ok) {
          return response;
        }
        switch (response.status) {
          case 400:
            throw Error('INVALID_TOKEN');
          case 401:
            throw Error('UNAUTHORIZED');
          case 500:
            throw Error('INTERNAL_SERVER_ERROR');
          case 502:
            throw Error('BAD_GATEWAY');
          case 404:
            throw Error('NOT_FOUND');
          default:
            throw Error('UNHANDLED_ERROR');
        }
      })
      .then(response => response.json())
      .then(json => {
        // status
        this.setData('searchStatus', {
          available: Math.min(json.statistics.filtered, json.scroll.max_rows),
          filtered: json.statistics.filtered,
          total: json.statistics.total
        });

        // results
        this.setData('numberOfRecords', this.getData('searchStatus').available);
        this.setResults(json.data, json.scroll.offset);

        // statistics
        // dataset
        this.setData('statisticsDataset', json.statistics.dataset);
        // significance
        this.setData('statisticsSignificance', json.statistics.significance);
        // total_variant_type
        this.setData('statisticsType', json.statistics.type);
        // consequence
        this.setData('statisticsConsequence', json.statistics.consequence);

        this.setData('searchMessages', {
          error: json.error,
          warning: json.warning,
          notice: json.notice
        });

        this._fetching = false;
        this._notify('offset');
        this.setData('appStatus', 'normal');

        // もし検索中に検索条件が変われば、再検索
        if (lastConditions !== JSON.stringify(this._store.searchConditions)) {
          this._setSearchConditions({});
        }
      });
  }

  get _searchMode() {
    if (this._body === undefined) {
      this._body = document.getElementsByTagName('body')[0];
    }
    console.log( this._body )
    return { SimpleSearchView: 'simple', AdvancedSearchView: 'advanced' }[this._body.dataset.searchMode];
  }
}

export default new StoreManager();
