/*global $ */

const LIMIT = 100;

class StoreManager {

  constructor() {
    this.isReady = false;
    this.URIParameters = $.deparam(window.location.search.substr(1));
    this.bindings = {};
    this.fetching = false;
    this.store = {
      searchResults: [],
      numberOfRecords: 0,
      offset: 0,
      rowCount: 0,
      appStatus: 'preparing'
    };

    window.addEventListener('popstate', this.popstate.bind(this));
  }

  ready(callback) {
    Promise
      .all([
        fetch('./assets/searchConditionsMaster.json')
          .then(response => response.json())
      ])
      .then(responses => {
        Object.freeze(responses[0]);
        this.setData('searchConditionsMaster', responses[0]);
        this.store.searchConditions = this.extractSearchCondition(this.URIParameters);
        callback();
        this.isReady = true;
        this.search(0);
      });
  }

  getData(key) {
    return this.copy(this.store[key]);
  }

  getSelectedRecord() {
    if (this.store.selectedRow !== undefined) {
      return this.store.searchResults[this.store.offset + this.store.selectedRow];
    } else {
      return null;
    }
  }

  getRecordByIndex(index) {
    if (this.store.offset + index < this.store.numberOfRecords) {
      const record = this.store.searchResults[this.store.offset + index];
      if (record) {
        return this.copy(record);
      } else {
        this.search(this.store.offset + index);
        this.setData('appStatus', 'loading');
        return 'loading';
      }
    } else {
      return 'out of range';
    }
  }

  setData(key, value) {
    const
      isUndefined = this.store[key] === undefined,
      isMutated = typeof value === 'object' ?
        JSON.stringify(this.store[key]) !== JSON.stringify(value) :
        this.store[key] != value;
    if (isUndefined || isMutated) {
      this.store[key] = this.copy(value);
      this.notify(key);
    }
  }

  setResults(records, offset) {
    for (let i = 0; i < records.length; i++) {
      this.store.searchResults[offset + i] = records[i];
    }
    this.notify('searchResults');
  }

  notify(key) {
    if (this.bindings[key]) {
      for (const watcher of this.bindings[key]) {
        let value = this.store[key];
        const copy = this.copy(value);
        watcher[key](copy);
      }
    }
  }

  bind(key, target) {
    if (this.bindings[key] === undefined) {
      this.bindings[key] = [target];
    } else {
      this.bindings[key].push(target);
    }
  }

  copy(value) {
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
    this.setSearchConditions({[key]: values});
  }
  setSearchConditions(conditions, fromHistory) {
    const lastCondition = JSON.stringify(this.store.searchConditions);
    for (const conditionKey in conditions) {
      this.store.searchConditions[conditionKey] = conditions[conditionKey];
    }

    if (!fromHistory) this.reflectSearchConditionToURI();
    if (this.isReady && lastCondition !== JSON.stringify(this.store.searchConditions)) {
      this.setData('numberOfRecords', 0);
      this.setData('offset', 0);
      this.setData('rowCount', 0);
      this.store.searchResults = [];
      this.setResults([], 0);

      this.notify('searchConditions');

      this.setData('appStatus', 'searching');
      this.search(0);
    }
  }

  getSearchCondition(key) {
    return this.copy(this.store.searchConditions[key]);
  }

  getSearchConditionMaster(key) {
    return this.getData('searchConditionsMaster').find(condition => condition.id === key);
  }

  extractSearchCondition(condition) {
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

  reflectSearchConditionToURI() {
    const master = this.getData('searchConditionsMaster');
    const diffConditions = this.extractSearchCondition(this.store.searchConditions);
    for (const condition of master) {
      delete this.URIParameters[condition.id];
    }

    Object.assign(this.URIParameters, diffConditions);

    window.history.pushState(this.URIParameters, '', `${window.location.origin}${window.location.pathname}?${$.param(this.URIParameters)}`);
  }

  popstate(e) {
    const URIParameters = $.deparam(window.location.search.substr(1));
    this.setSearchConditions(URIParameters, true);
  }

  search(offset) {
    if (this.fetching === true) {
      return;
    }

    this.fetching = true;
    let path;
    if (this.URIParameters.path === 'local') {
      if (offset === 0) {
        path = 'results.json';
      }
    } else {
      path = `/search?offset=${offset - offset % LIMIT}&${$.param(this.extractSearchCondition(this.store.searchConditions))}`;
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

        this.setData('numberOfRecords', this.getData('searchStatus').available);
        this.setResults(json.data, json.scroll.offset);

        this.setData('statisticsDataset', json.statistics.dataset);
        this.setData('statisticsSignificance', json.statistics.significance);
        this.setData('statisticsType', json.statistics.type);
        this.setData('statisticsConsequence', json.statistics.consequence);

        this.fetching = false;
        this.notify('offset');
        this.setData('appStatus', 'normal');
      });
  }
}

export default new StoreManager();
