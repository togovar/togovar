import deparam from 'deparam.js';
import { API_URL } from '../global.js';
import { debounce } from '../utils/debounce.js';

const LIMIT = 100;
const DEFAULT_SEARCH_MODE = 'simple'; // 'simple' or 'advanced';

export const mixin = {
  _abortController: new AbortController(),

  initSearchCondition() {
    this._isReady = false;
    this._fetching = false;
    this._URIParameters = deparam(window.location.search.substr(1));
    // events
    window.addEventListener('popstate', this._popstate.bind(this));
    this.bind('searchMode', this);
  },

  readySearch(callback) {
    // get master data of conditions
    const json = ((reference) => {
      switch (reference) {
        case 'GRCh37':
          return require('../../assets/GRCh37/search_conditions.json');
        case 'GRCh38':
          return require('../../assets/GRCh38/search_conditions.json');
        default:
          return [];
      }
    })(TOGOVAR_FRONTEND_REFERENCE);
    Object.freeze(json);
    this.setData('simpleSearchConditionsMaster', json);
    // restore search conditions from URL parameters
    const searchMode = this._URIParameters.mode ?? DEFAULT_SEARCH_MODE,
      simpleSearchConditions = {},
      advancedSearchConditions = {};
    switch (searchMode) {
      case 'simple':
        Object.assign(
          simpleSearchConditions,
          this._extractSearchCondition(this._URIParameters)
        );
        break;
      case 'advanced':
        break;
    }
    this._store.simpleSearchConditions = simpleSearchConditions;
    this._store.advancedSearchConditions = advancedSearchConditions;
    callback();
    this._isReadySearch = true;
    this._search(0, true);
  },

  // Search condition *******************************************

  setSimpleSearchCondition(key, values) {
    if (!this._isReadySearch) return;
    this._setSimpleSearchConditions({ [key]: values });
  },

  // in Advanced Search, search criteria are received as queries, not key values.
  setAdvancedSearchCondition(conditions, fromHistory) {
    if (!this._isReadySearch) return;
    this._store.advancedSearchConditions = conditions;
    // convert queries to URL parameters
    if (!fromHistory) this._reflectAdvancedSearchConditionToURI();
    this._notify('advancedSearchConditions');
    this.setData('appStatus', 'searching');
    this._search(0, true);
  },

  _setSimpleSearchConditions(conditions, fromHistory) {
    for (const conditionKey in conditions) {
      this._store.simpleSearchConditions[conditionKey] =
        conditions[conditionKey];
    }
    // URIパラメータに反映
    if (!fromHistory) this._reflectSimpleSearchConditionToURI();
    // 検索条件として成立していれば、検索開始
    if (this._isReadySearch) {
      this._notify('simpleSearchConditions');
      this.setData('appStatus', 'searching');
      this._search(0, true);
    }
  },

  resetSimpleSearchConditions() {
    const simpleSearchConditionsMaster = this.getData(
        'simpleSearchConditionsMaster'
      ),
      resetConditions = {};
    for (const condition of simpleSearchConditionsMaster) {
      switch (condition.type) {
        case 'string':
        case 'boolean':
          if (condition.id !== 'term')
            resetConditions[condition.id] = condition.default;
          break;
        case 'array':
          {
            const temp = {};
            for (const item of condition.items) {
              temp[item.id] = item.default;
            }
            resetConditions[condition.id] = temp;
          }
          break;
      }
    }
    this._setSimpleSearchConditions(resetConditions);
  },

  getSimpleSearchCondition(key) {
    return this._copy(this._store.simpleSearchConditions[key]);
  },

  // getAdvancedSearchCondition(key) {
  //   return this._copy(this._store.advancedSearchConditions[key]);
  // },

  getSimpleSearchConditionMaster(key) {
    return this.getData('simpleSearchConditionsMaster').find(
      (condition) => condition.id === key
    );
  },

  // デフォルト値と異なる検索条件を抽出
  _extractSearchCondition(condition) {
    const simpleSearchConditionsMaster = this.getData(
      'simpleSearchConditionsMaster'
    );
    // extraction of differences from master data
    const diffConditions = {};
    for (let conditionKey in condition) {
      const conditionMaster = simpleSearchConditionsMaster.find(
        (condition) => condition.id === conditionKey
      );
      if (conditionMaster) {
        switch (conditionMaster.type) {
          case 'array':
            {
              const filtered = {};
              for (const item in condition[conditionKey]) {
                if (
                  condition[conditionKey][item] !==
                  conditionMaster.items.find(
                    (condition) => condition.id === item
                  )?.default
                ) {
                  filtered[item] = condition[conditionKey][item];
                }
              }
              if (Object.keys(filtered).length > 0) {
                diffConditions[conditionKey] = filtered;
              }
            }
            break;
          case 'boolean':
          case 'string':
            {
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

  // update uri parameters
  _reflectSimpleSearchConditionToURI() {
    const diffConditions = this._extractSearchCondition(
      this._store.simpleSearchConditions
    );
    // remove uri parameters temporally
    this._URIParameters = {};
    this._URIParameters.mode = 'simple';
    // synthesize parameters
    Object.assign(this._URIParameters, diffConditions);
    window.history.pushState(
      this._URIParameters,
      '',
      `${window.location.origin}${window.location.pathname}?${$.param(
        this._URIParameters
      )}`
    );
  },

  _reflectAdvancedSearchConditionToURI() {
    this._URIParameters.mode = 'advanced';
    window.history.pushState(
      this._URIParameters,
      '',
      `${window.location.origin}${window.location.pathname}?mode=advanced`
    );
  },

  // ヒストリーが変更されたら、URL変数を取得し検索条件を更新
  _popstate(_e) {
    const URIParameters = deparam(window.location.search.substr(1));
    this._setSimpleSearchConditions(URIParameters, true);
  },

  // Search *******************************************
  /**
   *
   * @param {Number} offset
   * @param {Boolean} isFirstTime
   */

  _search(offset, isFirstTime = false) {
    return debounce((offset, isFirstTime) => {
      // If search is in progress, abort previous request and create a new AbortController
      if (this._fetching === true) {
        this._store._abortController.abort('newSearchStarted');
        this._store._abortController = new AbortController();
        this._fetching = false;
      }

      // Reset search results
      if (isFirstTime) {
        this.setData('numberOfRecords', 0);
        this.setData('offset', 0);
        this.setData('rowCount', 0);
        this._store.searchResults = [];
        this.setResults([], 0);
      }

      // Retain search conditions
      const lastConditions = JSON.stringify(this._store.simpleSearchConditions); // TODO:

      // Set fetching flag to true
      this._fetching = true;

      // Set options for fetch request
      const options = {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        mode: 'cors',
        signal: this._store._abortController.signal,
      };

      // Set path for fetch request
      let path;
      if (this._URIParameters.path === 'local') {
        if (offset === 0) {
          path = 'results.json';
        }
      } else {
        switch (this._store.searchMode) {
          case 'simple':
            {
              const conditions = $.param(
                this._extractSearchCondition(this._store.simpleSearchConditions)
              );
              path = `${API_URL}/search?offset=${offset - (offset % LIMIT)}${
                conditions ? '&' + conditions : ''
              }`;
              options.method = 'GET';
            }
            break;
          case 'advanced':
            {
              path = `${API_URL}/api/search/variant`;
              const body = { offset: this._store.offset };
              if (
                this._store.advancedSearchConditions &&
                Object.keys(this._store.advancedSearchConditions).length > 0
              ) {
                body.query = this._store.advancedSearchConditions;
              }
              options.method = 'POST';
              options.body = JSON.stringify(body);
            }
            break;
        }
      }

      // Fetch data from server
      this._fetchData(path, options, lastConditions);
    })(offset, isFirstTime);
  },

  async _fetchData(path, options, lastConditions) {
    try {
      const response = await fetch(path, options);
      if (!response.ok) {
        throw new Error(this._getErrorType(response.status));
      }
      const json = await response.json();
      this._setDataFromJson(json, lastConditions);
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn('User aborted the request');
        return;
      }
      const error = err instanceof Error ? err.message : null;
      this.setData('searchMessages', { error });
      throw err;
    }
  },

  _getErrorType(status) {
    switch (status) {
      case 400:
        return 'INVALID_TOKEN';
      case 401:
        return 'UNAUTHORIZED';
      case 500:
        return 'INTERNAL_SERVER_ERROR';
      case 502:
        return 'BAD_GATEWAY';
      case 404:
        return 'NOT_FOUND';
      default:
        return 'UNHANDLED_ERROR';
    }
  },

  _setDataFromJson(json, lastConditions) {
    // status
    this.setData('searchStatus', {
      available: Math.min(json.statistics.filtered, json.scroll.max_rows),
      filtered: json.statistics.filtered,
      total: json.statistics.total,
    });

    // results
    this.setData('numberOfRecords', this.getData('searchStatus').available);
    this.setResults(json.data, json.scroll.offset);

    // statistics
    this.setData('statisticsDataset', json.statistics.dataset); // dataset
    this.setData('statisticsSignificance', json.statistics.significance); // significance
    this.setData('statisticsType', json.statistics.type); // total_variant_type
    this.setData('statisticsConsequence', json.statistics.consequence); // consequence

    this.setData('searchMessages', {
      error: json.error,
      warning: json.warning,
      notice: json.notice,
    });

    this._fetching = false;
    this._notify('offset');
    this.setData('appStatus', 'normal');

    // if the search conditions change during the search, re-search
    if (lastConditions !== JSON.stringify(this._store.simpleSearchConditions)) {
      this._setSimpleSearchConditions({});
    }
    // for Download button
    const hasConditions =
      Object.keys(this._store.advancedSearchConditions).length > 0;
    document.body.toggleAttribute('data-has-conditions', hasConditions);
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
          this.setSimpleSearchCondition({});
          break;
        case 'advanced':
          {
            const condition = this._store.advancedSearchConditions;
            this.setAdvancedSearchCondition(condition);
          }
          break;
      }
      // start search
      this.setData('appStatus', 'searching');
    }
  },
};
