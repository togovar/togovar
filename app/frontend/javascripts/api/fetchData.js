import StoreManager from '../store/StoreManager';
import qs from 'qs';
import _ from 'lodash';
import { API_URL } from '../global.js';
const LIMIT = 100;
import {
  _setSimpleSearchConditions,
  extractSearchCondition,
} from '../store/searchManager.js';

let currentAbortController = null;
let _currentSearchMode;
let lastRequestRanges = new Set(); // 取得済みの範囲を管理

/** 検索を実行するメソッド（データ取得 & 更新）
 * @param {Number} offset - 検索開始位置
 * @param {Boolean} isFirstTime - 最初の検索かどうか */
export const executeSearch = (() => {
  return _.debounce((offset = 0, isFirstTime = false) => {
    const newSearchMode = StoreManager.getData('searchMode');
    if (!isFirstTime && _currentSearchMode !== newSearchMode) {
      // mode切替時
      currentAbortController.abort(); // Abort処理
      _currentSearchMode = newSearchMode;
      isFirstTime = true;  // データリセットのため
      lastRequestRanges.clear(); // モード切り替え時にクリア

    } else {
      // スクロール時
      const offsetStart = offset - (offset % LIMIT);
      const rangeKey = `${offsetStart}-${offsetStart + LIMIT}`;

      if (StoreManager.getData('searchMode') === 'simple') {
        // 未取得の範囲の場合のみリクエスト
        if (!lastRequestRanges.has(rangeKey)) {
          lastRequestRanges.add(rangeKey);
        } else {
          return; // 既に取得済みの範囲はスキップ
        }
      }
    }

    // 現在の検索モードを保存
    _currentSearchMode = newSearchMode;

    // 新しい AbortController を作成
    currentAbortController = new AbortController();
    const signal = currentAbortController.signal;

    // 初回検索時のデータリセット
    if (isFirstTime) {
      _resetSearchResults();
      lastRequestRanges.clear(); // リセット時にクリア
    }

    // フェッチフラグを設定
    StoreManager.setData('isFetching', true);

    // API のエンドポイントを取得
    const apiEndpoints = _determineSearchEndpoints(
      offset,
      isFirstTime
    );

    // API リクエストオプションを設定
    const requestOptions = _getRequestOptions(signal);

    // データ取得
    apiEndpoints?.forEach((endpoint) => {
      _fetchData(endpoint, requestOptions);
    });
  }, 100);
})();

/** 初回検索時のデータをリセット */
function _resetSearchResults() {
  StoreManager.setData('numberOfRecords', 0);
  StoreManager.setData('offset', 0);
  StoreManager.setData('rowCount', 0);
  StoreManager.setData('isFetching', false);
  StoreManager.setData('searchResults', []);
  lastRequestRanges.clear(); // データリセット時にクリア
}

/** 検索用 API のエンドポイントを取得
 * @param {Number} offset - 検索開始位置
 * @param {Boolean} isFirstTime - 最初の検索かどうか
 * @returns {Array} API コール用の URL リスト */
function _determineSearchEndpoints(offset, isFirstTime) {
  let basePath;
  let conditions = '';

  switch (StoreManager.getData('searchMode')) {
    case 'simple': {
      // Simple searchの場合のみLIMITでの調整を行う
      const offsetStart = offset - (offset % LIMIT);
      conditions = qs.stringify(
        extractSearchCondition(StoreManager.getData('simpleSearchConditions'))
      );
      basePath = `${API_URL}/search?offset=${offsetStart}${conditions ? '&' + conditions : ''
        }`;

      return isFirstTime
        ? [`${basePath}&stat=0&data=1`, `${basePath}&stat=1&data=0`]
        : [`${basePath}&stat=0&data=1`];
    }

    case 'advanced': {
      // Advanced searchの場合は元のoffsetをそのまま使用
      basePath = `${API_URL}/api/search/variant`;

      return isFirstTime
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
    // Advanced searchの場合は元のoffsetを使用
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
 * @param {Object} options - Fetch リクエストオプション */
async function _fetchData(endpoint, options) {
  try {
    const response = await fetch(endpoint, options);
    if (!response.ok) {
      throw new Error(_getErrorMessage(response.status));
    }
    const jsonResponse = await response.json();

    // 現在の検索モードと一致する場合のみ結果を処理
    if (_currentSearchMode === StoreManager.getData('searchMode')) {
      if ('data' in jsonResponse) {
        _processSearchResults(jsonResponse);
      }
      if ('statistics' in jsonResponse) {
        _processStatistics(jsonResponse);
      }
    }

    await _updateAppState();
  } catch (error) {
    if (error.name === 'AbortError') return;
    console.error('Fetch error:', error);
    StoreManager.setData('isFetching', false);
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

/** 検索状態を更新し、条件が変わっていた場合は再検索 */
async function _updateAppState() {
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
  StoreManager.setData('appStatus', 'normal'); // TODO: 変数名変更する Result画面の全体Loadingicon
}
