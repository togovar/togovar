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
    Promise
      .all([
        fetch('./assets/search_conditions.json')
          .then(response => response.json())
      ])
      .then(responses => {
        Object.freeze(responses[0]);
        this.setData('searchConditionsMaster', responses[0]);
        this._store.searchConditions = this._extractSearchCondition(this._URIParameters);
        callback();
        this._isReady = true;
        this._search(0);
      });
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
        this._search(this._store.offset + index);
        this.setData('appStatus', 'loading');
        return 'loading';
      }
    } else {
      return 'out of range';
    }
  }

  setData(key, value) {
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

  setResults(records, offset) {
    for (let i = 0; i < records.length; i++) {
      this._store.searchResults[offset + i] = records[i];
    }
    this._notify('searchResults');
  }

  _notify(key) {
    if (this._bindings[key]) {
      for (const watcher of this._bindings[key]) {
        let value = this._store[key];
        const copy = this._copy(value);
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
    switch (true) {
      case Array.isArray(value):
        return JSON.parse(JSON.stringify(value));
      case typeof value === 'object':
        return Object.assign({}, value);
      default:
        return value;
    }
  }

  setSearchCondition(key, values) {
    this._setSearchConditions({[key]: values});
  }

  _setSearchConditions(conditions, fromHistory) {
    for (const conditionKey in conditions) {
      this._store.searchConditions[conditionKey] = conditions[conditionKey];
    }
    if (!fromHistory) this._reflectSearchConditionToURI();
    if (this._isReady) {
      this.setData('numberOfRecords', 0);
      this.setData('offset', 0);
      this.setData('rowCount', 0);
      this._store.searchResults = [];
      this.setResults([], 0);
      this._notify('searchConditions');
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

  _extractSearchCondition(condition) {
    const searchConditionsMaster = this.getData('searchConditionsMaster');

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

  _reflectSearchConditionToURI() {
    const master = this.getData('searchConditionsMaster');
    const diffConditions = this._extractSearchCondition(this._store.searchConditions);
    for (const condition of master) {
      delete this._URIParameters[condition.id];
    }
    Object.assign(this._URIParameters, diffConditions);
    window.history.pushState(this._URIParameters, '', `${window.location.origin}${window.location.pathname}?${$.param(this._URIParameters)}`);
  }

  _popstate(e) {
    const URIParameters = $.deparam(window.location.search.substr(1));
    this._setSearchConditions(URIParameters, true);
  }

  _search(offset) {
    if (this._fetching === true) {
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
    fetch(path)
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

        if (lastConditions !== JSON.stringify(this._store.searchConditions)) {
          this._setSearchConditions({});
        }
      });
  }
}

export default new StoreManager();
