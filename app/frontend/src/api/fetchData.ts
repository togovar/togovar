import { storeManager } from '../store/StoreManager';
import * as qs from 'qs';
import * as _ from 'lodash';
import { API_URL } from '../global.js';
const LIMIT = 100;
import { extractSearchCondition } from '../store/searchManager';
import { FetchOption, SearchResults, SearchStatistics } from '../types';

let currentAbortController = null;
let _currentSearchMode: 'simple' | 'advanced' | null = null;
let lastRequestRanges = new Set(); // 取得済みの範囲を管理

/** 検索を実行するメソッド（データ取得 & 更新） */
export const executeSearch = (() => {
  return _.debounce((offset = 0, isFirstTime = false) => {
    const newSearchMode = storeManager.getData('searchMode');

    // 新しい検索リクエストの前に、既存のリクエストをキャンセル
    if (currentAbortController) {
      currentAbortController.abort();
    }

    if (_currentSearchMode && _currentSearchMode !== newSearchMode) {
      // mode切替時
      _currentSearchMode = newSearchMode;
      isFirstTime = true; // データリセットのため
      lastRequestRanges.clear(); // モード切り替え時にクリア
    } else {
      // スクロール時
      const offsetStart = offset - (offset % LIMIT);
      const rangeKey = `${offsetStart}-${offsetStart + LIMIT}`;

      if (storeManager.getData('searchMode') === 'simple') {
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
    storeManager.setData('isFetching', true);

    // API のエンドポイントを取得
    const apiEndpoints = _determineSearchEndpoints(offset, isFirstTime);

    // API リクエストオプションを設定
    const requestOptions = _getRequestOptions(signal);

    // データ取得
    apiEndpoints?.forEach((endpoint) => {
      _fetchData(endpoint, requestOptions);
    });
  }, 10);
})();

/** 初回検索時のデータをリセット */
function _resetSearchResults() {
  storeManager.setData('numberOfRecords', 0);
  storeManager.setData('offset', 0);
  storeManager.setData('rowCount', 0);
  storeManager.setData('isFetching', false);
  storeManager.setData('searchResults', []);
  lastRequestRanges.clear(); // データリセット時にクリア
}

/** 検索用 API のエンドポイントを取得 */
function _determineSearchEndpoints(
  offset: number,
  isFirstTime: boolean
): string[] {
  let basePath: string;
  let conditions = '';

  switch (storeManager.getData('searchMode')) {
    case 'simple': {
      // Simple searchの場合のみLIMITでの調整を行う
      const offsetStart = offset - (offset % LIMIT);
      conditions = qs.stringify(
        extractSearchCondition(storeManager.getData('simpleSearchConditions'))
      );
      basePath = `${API_URL}/search?offset=${offsetStart}${
        conditions ? '&' + conditions : ''
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

/** API リクエストのオプションを作成 */
function _getRequestOptions(signal: AbortSignal): FetchOption {
  if (storeManager.getData('searchMode') === 'simple') {
    // Simple search のリクエストオプション
    return {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      mode: 'cors',
      signal: signal,
    };
  }

  // Advanced search のリクエストオプション
  const body: Partial<{ offset: number; query: any }> = {
    offset: _calculateOffset(storeManager.getData('offset'), LIMIT),
  };

  if (
    storeManager.getData('advancedSearchConditions') &&
    Object.keys(storeManager.getData('advancedSearchConditions')).length > 0
  ) {
    body.query = storeManager.getData('advancedSearchConditions');
  }

  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    mode: 'cors',
    signal: signal,
    body: JSON.stringify(body),
  };
}

function _calculateOffset(offset: number, limit: number): number {
  const roundedOffset =
    Math.round(offset / (limit / 2)) * (limit / 2) - limit / 4;
  return Math.max(0, roundedOffset);
}

/** データを取得して結果を更新 */
async function _fetchData(endpoint: string, options: FetchOption) {
  try {
    const response = await fetch(endpoint, options);
    if (!response.ok) {
      throw new Error(_getErrorMessage(response.status));
    }
    const jsonResponse = await response.json();
    const url = new URL(endpoint);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    // 現在の検索モードと一致する場合のみ結果を処理
    if (_currentSearchMode === storeManager.getData('searchMode')) {
      if (queryParams.data === '1') {
        _processSearchResults(jsonResponse);
      }
      if (queryParams.stat === '1') {
        _processStatistics(jsonResponse);
      }
    }

    await _updateAppState();

    if (jsonResponse.notice || jsonResponse.warning || jsonResponse.error) {
      storeManager.setData('searchMessages', {
        notice: jsonResponse.notice?.join?.('<br>'),
        warning: jsonResponse.warning?.join?.('<br>'),
        error: jsonResponse.error?.join?.('<br>'),
      });
    } else {
      storeManager.setData('searchMessages', '');
    }
  } catch (error) {
    console.error(error);
    if (error.name === 'AbortError') return;
    storeManager.setData('isFetching', false);
    storeManager.setData('searchMessages', { error });
  }
}

/** HTTP ステータスコードに応じたエラーメッセージを取得 */
function _getErrorMessage(statusCode: number): string {
  const errorTypes = {
    400: 'INVALID_REQUEST',
    401: 'UNAUTHORIZED',
    404: 'NOT_FOUND',
    500: 'INTERNAL_SERVER_ERROR',
    502: 'BAD_GATEWAY',
  };
  return errorTypes[statusCode] || 'UNKNOWN_ERROR';
}

/** 検索結果データをセット */
function _processSearchResults(json: SearchResults) {
  // results
  storeManager.setResults(json.data, json.scroll.offset);
}

/** 統計情報をセット */
function _processStatistics(json: SearchStatistics) {
  // status
  storeManager.setData('searchStatus', {
    available: Math.min(json.statistics.filtered, json.scroll.max_rows),
    filtered: json.statistics.filtered,
    total: json.statistics.total,
  });
  storeManager.setData(
    'numberOfRecords',
    storeManager.getData('searchStatus').available
  );

  // statistics
  storeManager.setData('statisticsDataset', json.statistics.dataset); // dataset
  storeManager.setData('statisticsSignificance', json.statistics.significance); // significance
  storeManager.setData('statisticsType', json.statistics.type); // total_variant_type
  storeManager.setData('statisticsConsequence', json.statistics.consequence); // consequence
}

/** 検索状態を更新し、条件が変わっていた場合は再検索 */
async function _updateAppState() {
  // for Download button
  storeManager.getData('searchMode');
  switch (storeManager.getData('searchMode')) {
    case 'simple':
      if (storeManager.getData('simpleSearchConditions').term) {
        document.body.setAttribute('data-has-conditions', 'true');
      }
      break;
    case 'advanced':
      document.body.toggleAttribute(
        'data-has-conditions',
        Object.keys(storeManager.getData('advancedSearchConditions')).length > 0
      );
  }

  // まずoffsetを更新して表示位置を確定
  storeManager.publish('offset');

  // 次にデータを更新
  storeManager.publish('searchResults');

  // 最後にステータスを更新
  storeManager.setData('appStatus', 'normal');
}
