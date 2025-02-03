import StoreManager from '../store/StoreManager';
import qs from 'qs';
import _ from 'lodash';
import { API_URL } from '../global.js';
const LIMIT = 100;
import { _setSimpleSearchConditions, extractSearchCondition } from "../store/searchManager.js"

let currentAbortController = null;
let _currentSearchMode

/** 検索を実行するメソッド（データ取得 & 更新）
 * @param {Number} offset - 検索開始位置
 * @param {Boolean} isFirstTime - 最初の検索かどうか */
export const executeSearch = (() => {
  return _.debounce((offset = 0, isFirstTime = false, isAbort = false) => {
    if (StoreManager.getData('isFetching')) return

    _currentSearchMode = StoreManager.getData('searchMode');

    // 🔹 新しい AbortController を作成
    currentAbortController = new AbortController();
    const signal = currentAbortController.signal;

    // 初回検索時のデータリセット
    if (isFirstTime) _resetSearchResults();

    // 検索条件を保存
    const previousConditions = JSON.stringify(
      StoreManager.getData('simpleSearchConditions')
    ); // TODO: AdvancedSearchの条件も保存する

    // フェッチフラグを設定
    StoreManager.setData('isFetching', true);

    // API のエンドポイントを取得
    const apiEndpoints = _determineSearchEndpoints(offset, isFirstTime, isAbort);

    // API リクエストオプションを設定
    const requestOptions = _getRequestOptions(signal);

    // データ取得（初回のみ2回 API コール、それ以外は1回）
    apiEndpoints?.forEach((endpoint) => {
      _fetchData(endpoint, requestOptions, previousConditions);
    });
    // });
  }, 0);
})();

/** 初回検索時のデータをリセット */
function _resetSearchResults() {
  StoreManager.setData('numberOfRecords', 0);
  StoreManager.setData('offset', 0);
  StoreManager.setData('rowCount', 0);
  StoreManager.setData('isFetching', false);
  StoreManager.setData('searchResults', []);
}

/** 検索用 API のエンドポイントを取得
 * @param {Number} offset - 検索開始位置
 * @param {Boolean} isFirstTime - 最初の検索かどうか
 * @returns {Array} API コール用の URL リスト */
function _determineSearchEndpoints(offset, isFirstTime, isAbort) {
  let basePath;
  let conditions = '';

  switch (StoreManager.getData('searchMode')) {
    case 'simple': {
      conditions = qs.stringify(
        extractSearchCondition(StoreManager.getData('simpleSearchConditions'))
      );
      basePath = `${API_URL}/search?offset=${offset - (offset % LIMIT)}${conditions ? '&' + conditions : ''
        }`;

      return isAbort
        ? [`${basePath}&stat=1&data=0`]
        : isFirstTime
          ? [`${basePath}&stat=0&data=1`, `${basePath}&stat=1&data=0`]
          : [`${basePath}&stat=0&data=1`];
    }

    case 'advanced': {
      basePath = `${API_URL}/api/search/variant`;

      return isAbort
        ? [`${basePath}?stat=1&data=0`]
        : isFirstTime
          ? [`${basePath}?stat=0&data=1`, `${basePath}?stat=1&data=0`]
          : [`${basePath}?stat=0&data=1`];
    }
  }
}

/** API リクエストのオプションを作成
 * @returns {Object} Fetch API のオプション */
function _getRequestOptions(signal) {
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    mode: 'cors',
    signal: signal,
  };

  if (StoreManager.getData('searchMode') === 'advanced') {
    options.method = 'POST';

    const body = { offset: StoreManager.getData('offset') };
    if (
      StoreManager.getData('advancedSearchConditions') &&
      Object.keys(StoreManager.getData('advancedSearchConditions')).length > 0
    ) {
      body.query = StoreManager.getData('advancedSearchConditions');
    }
    options.body = JSON.stringify(body);
  }

  return options;
}

/** データを取得して結果を更新
 * @param {String} endpoint - API エンドポイント
 * @param {Object} options - Fetch リクエストオプション
 * @param {String} previousConditions - 直前の検索条件（比較用） */
async function _fetchData(endpoint, options, previousConditions) {
  try {
    const response = await fetch(endpoint, options);
    if (!response.ok) {
      throw new Error(_getErrorMessage(response.status));
    }
    const jsonResponse = await response.json();

    if ('data' in jsonResponse) {
      _processSearchResults(jsonResponse);
    }
    if ('statistics' in jsonResponse) {
      _processStatistics(jsonResponse);
    }

    _updateAppState(previousConditions);

    if (_currentSearchMode !== StoreManager.getData('searchMode')) {
      currentAbortController.abort();
      StoreManager.notify('offset');
      StoreManager.setData('isFetching', false);
      // executeSearch(0, false, true);
      executeSearch(0, true);
    }

    StoreManager.setData('isFetching', false);
  } catch (err) {
    console.log(err);
    if (err.name === 'AbortError') {
      console.warn('User aborted the request');
      return;
    }
    const error = err instanceof Error ? err.message : null;
    StoreManager.setData('searchMessages', { error });
    StoreManager.setData('isFetching', false);
    throw err;
  }
}

/** HTTP ステータスコードに応じたエラーメッセージを取得
 * @param {Number} statusCode - HTTP ステータスコード
 * @returns {String} エラーメッセージ */
function _getErrorMessage(statusCode) {
  const errorTypes = {
    400: 'INVALID_REQUEST',
    401: 'UNAUTHORIZED',
    404: 'NOT_FOUND',
    500: 'INTERNAL_SERVER_ERROR',
    502: 'BAD_GATEWAY',
  };
  return errorTypes[statusCode] || 'UNKNOWN_ERROR';
}

/** 検索結果データをセット
 * @param {Object} jsonResponse - API レスポンスデータ */
function _processSearchResults(json) {
  // results
  StoreManager.setResults(json.data, json.scroll.offset);
}

/** 統計情報をセット
 * @param {Object} jsonResponse - API レスポンスデータ */
function _processStatistics(json) {
  // status
  StoreManager.setData('searchStatus', {
    available: Math.min(json.statistics.filtered, json.scroll.max_rows),
    filtered: json.statistics.filtered,
    total: json.statistics.total,
  });

  // results
  StoreManager.setData(
    'numberOfRecords',
    StoreManager.getData('searchStatus').available
  );

  // statistics
  StoreManager.setData('statisticsDataset', json.statistics.dataset); // dataset
  StoreManager.setData('statisticsSignificance', json.statistics.significance); // significance
  StoreManager.setData('statisticsType', json.statistics.type); // total_variant_type
  StoreManager.setData('statisticsConsequence', json.statistics.consequence); // consequence
}

/** 検索状態を更新し、条件が変わっていた場合は再検索
 * @param {String} previousConditions - 直前の検索条件（比較用） */
async function _updateAppState(previousConditions) {
  //検索中に条件が変更されていたら、再検索する(いらないかも)
  if (previousConditions !== JSON.stringify(StoreManager.getData('simpleSearchConditions'))) {
    _setSimpleSearchConditions({});
  }

  // is Login
  await StoreManager.fetchLoginStatus();

  // for Download button
  StoreManager.getData('searchMode');
  switch (StoreManager.getData('searchMode')) {
    case 'simple':
      if (StoreManager.getData('simpleSearchConditions').term) {
        document.body.setAttribute('data-has-conditions', true);
      }
      break;
    case 'advanced':
      document.body.toggleAttribute(
        'data-has-conditions',
        Object.keys(StoreManager.getData('advancedSearchConditions')).length > 0
      );
  }


  StoreManager.notify('offset');
  StoreManager.setData('appStatus', 'normal');
}
