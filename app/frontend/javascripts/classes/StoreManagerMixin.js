import {API_URL} from "../global.js";

const LIMIT = 100;
const DEFAULT_SEARCH_MODE = 'simple'; // 'simple' or 'advanced';

export const mixin = {

  initSearchCondition() {
    this._URIParameters = $.deparam(window.location.search.substr(1));
    // events
    window.addEventListener('popstate', this._popstate.bind(this));
    this.bind('searchMode', this);
  },

  readySearch(callback) {
    // get master data of conditions
    const json = require('../../assets/search_conditions.json');
    Object.freeze(json);
    this.setData('searchConditionsMaster', json);
    // restore search conditions from URL parameters
    const searchMode = this._URIParameters.mode ?? DEFAULT_SEARCH_MODE;
    let simpleSearchConditions = {}, advancedSearchConditions = {}, setAd__vancedSearchConditions = {};
    switch (searchMode) {
      case 'simple':
        simpleSearchConditions = this._extractSearchCondition(this._URIParameters);
        break;
      case 'advanced':
        break;
    }
    this._store.searchConditions = simpleSearchConditions;
    this._store.advancedSearchConditions = advancedSearchConditions;
    this._store.ad__vancedSearchConditions = setAd__vancedSearchConditions;
    callback();
    this._isReadySearch = true;
    this._search(0, true);
  },


  // 検索条件 *******************************************
  
  // 検索条件は、特殊であるため専用メソッドを用意
  setSearchCondition(key, values) {
    if (!this._isReadySearch) return;
    this._setSearchConditions({[key]: values});
  },

  setAdvancedSearchCondition(key, values, fromHistory) {
    if (!this._isReadySearch) return;
    // TODO: シンプルサーチと挙動合わせる
    if (key) this._store.advancedSearchConditions[key] = values;
    // URIパラメータに反映
    if (!fromHistory) this._reflectAdvancedSearchConditionToURI();
    // 検索条件として成立していれば、検索開始
    if (!this._isReadySearch) return;
    this._notify('advancedSearchConditions');
    this.setData('appStatus', 'searching');
    this._search(0, true);
  },

  // in Advanced Search, search criteria are received as queries, not key values.
  setAd__vancedSearchCondition(conditions, fromHistory) {
    if (!this._isReadySearch) return;
    console.log(conditions)
    this._store.ad__vancedSearchConditions = conditions;
    // convert queries to URL parameters
    if (!fromHistory) this._reflectAd__vancedSearchConditionToURI();
    this._notify('ad__vancedSearchConditions');
    this.setData('appStatus', 'searching');
    this._search(0, true);
  },

  _setSearchConditions(conditions, fromHistory) {
    for (const conditionKey in conditions) {
      this._store.searchConditions[conditionKey] = conditions[conditionKey];
    }
    // URIパラメータに反映
    if (!fromHistory) this._reflectSearchConditionToURI();
    // 検索条件として成立していれば、検索開始
    if (this._isReadySearch) {
      this._notify('searchConditions');
      this.setData('appStatus', 'searching');
      this._search(0, true);
    }
  },

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
  },

  getSearchCondition(key) {
    return this._copy(this._store.searchConditions[key]);
  },

  getAdvancedSearchCondition(key) {
    return this._copy(this._store.advancedSearchConditions[key]);
  },

  getSearchConditionMaster(key) {
    return this.getData('searchConditionsMaster').find(condition => condition.id === key);
  },

  // デフォルト値と異なる検索条件を抽出
  _extractSearchCondition(condition) {
    const searchConditionsMaster = this.getData('searchConditionsMaster');
    // extraction of differences from master data
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
  },

  _extractAdvancedSearchCondition(conditions) {
    // const searchConditionsMaster = this.getData('searchConditionsMaster');
    // const conditionMaster = searchConditionsMaster.find(condition => condition.id === 'adv_frequency'); // TODO: 暫定的にデータセットだけに対応
    const diffConditions = [];
    // extraction of differences from master data
    Object.keys(conditions).forEach(key => {
      const condition = conditions[key];
      switch (key) {
        case 'adv_frequency': {
          diffConditions.push(...this._convertSimpleRangeToSimpleAdvanced(condition));
        }
        break;
      }
    });
    return diffConditions
  },

  // update uri parameters
  _reflectSearchConditionToURI() {
    const diffConditions = this._extractSearchCondition(this._store.searchConditions);
    // remove uri parameters temporally
    this._URIParameters = {};
    this._URIParameters.mode ='simple';
    // synthesize parameters
    Object.assign(this._URIParameters, diffConditions);
    window.history.pushState(this._URIParameters, '', `${window.location.origin}${window.location.pathname}?${$.param(this._URIParameters)}`);
  },

  _reflectAdvancedSearchConditionToURI() {
    const diffConditions = this._extractAdvancedSearchCondition(this._store.advancedSearchConditions);
    this._URIParameters = this._buildAdvancedSearchQuery(diffConditions);
    this._URIParameters.mode ='advanced';
    window.history.pushState(this._URIParameters, '', `${window.location.origin}${window.location.pathname}?${$.param(this._URIParameters)}`);
  },

  _reflectAd__vancedSearchConditionToURI() {
  },

  _buildAdvancedSearchQuery(conditions) {
    return conditions.length === 0
      ? {}
      : {and: conditions};
  },

  // ヒストリーが変更されたら、URL変数を取得し検索条件を更新
  _popstate(_e) {
    const URIParameters = $.deparam(window.location.search.substr(1));
    this._setSearchConditions(URIParameters, true);
  },


  // 検索 *******************************************
  /**
   * 
   * @param {Number} offset 
   * @param {Boolean} isFirstTime 
   */
  _search(offset, isFirstTime = false) {

    // dont execute if search is in progress
    if (this._fetching === true) return;

    // reset
    if (isFirstTime) {
      this.setData('numberOfRecords', 0);
      this.setData('offset', 0);
      this.setData('rowCount', 0);
      this._store.searchResults = [];
      this.setResults([], 0);
    }

    // retain search conditions
    const lastConditions = JSON.stringify(this._store.searchConditions); // TODO:

    this._fetching = true;
    const options = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      mode: 'cors'
    }
    let path;
    if (this._URIParameters.path === 'local') {
      if (offset === 0) {
        path = 'results.json';
      }
    } else {
      switch (this._store.searchMode) {
        case 'simple': {
          const conditions = $.param(this._extractSearchCondition(this._store.searchConditions));
          path = `${API_URL}/search?offset=${offset - offset % LIMIT}${conditions ? '&' + conditions : ''}`;
          options.method = 'GET';
        }
          break;
        case 'advanced': {
          path = `${API_URL}/api/search/variation`;
          options.method = 'POST';
          options.body = JSON.stringify({
            query: this._store.ad__vancedSearchConditions,
            offset: this._store.offset
          });
        }
          break;
        }
    }
    fetch(path, options)
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

        // if the search conditions change during the search, re-search
        if (lastConditions !== JSON.stringify(this._store.searchConditions)) {
          this._setSearchConditions({});
        }
      });
  },


  // Bindings *******************************************
  searchMode(mode) {
    if (this._lastSearchMode !== mode) {
      this._lastSearchMode = mode;
      document.getElementsByTagName('body')[0].dataset.searchMode = mode;
      // TODO: 変更前の検索モードの検索条件の保存?
      // TODO: 検索条件のコンバート?
      // TODO: 検索条件のクリア（あるいは復帰）
      switch (mode) {
        case 'simple':
          this.setSearchCondition({});
          break;
        case 'advanced':
          this.setAdvancedSearchCondition();
          break;
      }
      // start search
      this.setData('appStatus', 'searching');
    }
  },

  _convertSimpleRangeToSimpleAdvanced(simpleConditions) {
    const advancedConditions = [];
    Object.keys(simpleConditions).forEach(datasetKey => {
      // process dataset frequencies for advanced search
      const dataset = {name: datasetKey};
      if (simpleConditions[datasetKey].invert === '1') {
        advancedConditions.push(
          {
            or: [
              {
                frequency: {
                  dataset,
                  frequency: {
                    gte: 0,
                    lte: simpleConditions[datasetKey].from
                  },
                  filtered: simpleConditions[datasetKey].filtered
                }
              },
              {
                frequency: {
                  dataset,
                  frequency: {
                    gte: simpleConditions[datasetKey].to,
                    lte: 1
                  },
                  filtered: simpleConditions[datasetKey].filtered
                }
              }
            ]
          }
        );
      } else {
        advancedConditions.push({
          frequency: {
            dataset,
            frequency: {
              gte: simpleConditions[datasetKey].from,
              lte: simpleConditions[datasetKey].to
            },
            filtered: simpleConditions[datasetKey].filtered
          }
        });
      }
    });
    return advancedConditions;
  }

}
