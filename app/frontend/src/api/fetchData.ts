import { storeManager } from '../store/StoreManager';
import * as qs from 'qs';
import debounce from 'lodash/debounce';
import { API_URL } from '../global';
import { stripAdvancedSearchMetadata } from '../store/advancedSearchURL';
import { extractSearchCondition } from '../store/simpleSearchConditions';
import type { FetchOption, SearchResults, SearchStatistics } from '../types';

const LIMIT = 100;
const DOWNLOAD_VARIANT_LIMIT = 100000;
const DOWNLOAD_VARIANT_LIMIT_TEXT = new Intl.NumberFormat('en-US').format(
  DOWNLOAD_VARIANT_LIMIT
);
const DOWNLOAD_LIMIT_TITLE = `Download is limited to ${DOWNLOAD_VARIANT_LIMIT_TEXT} variants.`;

let currentAbortController: AbortController | null = null;
let _currentSearchMode: 'simple' | 'advanced' | null = null;
const lastRequestRanges = new Set(); // 取得済みの範囲を管理

/** 検索を実行するメソッド（データ取得 & 更新） */
export const executeSearch = (() => {
  let isRequestInProgress = false;

  return debounce((offset = 0, isFirstTime = false) => {
    // 既にリクエストが進行中の場合はスキップ
    if (isRequestInProgress && !isFirstTime) {
      return;
    }

    const newSearchMode = storeManager.getData('searchMode');

    // 新しい検索リクエストの前に、既存のリクエストをキャンセル
    if (currentAbortController) {
      currentAbortController.abort();
    }

    if (_currentSearchMode && _currentSearchMode !== newSearchMode) {
      // mode切替時
      _currentSearchMode = newSearchMode || null;
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
    _currentSearchMode = newSearchMode || null;

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
    isRequestInProgress = true;

    // API のエンドポイントを取得
    const apiEndpoints = _determineSearchEndpoints(offset, isFirstTime);

    // API リクエストオプションを設定
    const requestOptions = _getRequestOptions(signal);

    // データ取得
    if (apiEndpoints && apiEndpoints.length > 0) {
      const requests = apiEndpoints.map((endpoint) => ({
        endpoint,
        promise: _fetchData(endpoint, requestOptions),
      }));
      const dataRequests = requests
        .filter(({ endpoint }) => _isDataRequestEndpoint(endpoint))
        .map(({ promise }) => promise);

      Promise.all(dataRequests)
        .then(() => {
          // 結果テーブルのloadingは行データの到着に合わせ、統計取得の遅延に引きずられないようにする。
          storeManager.setData('isFetching', false);
        })
        .catch((error) => {
          if (error instanceof Error && error.name === 'AbortError') return;
          storeManager.setData('isFetching', false);
        });

      Promise.all(requests.map(({ promise }) => promise))
        .then(() => {
          isRequestInProgress = false;
          _updateAppState();
        })
        .catch((error) => {
          // AbortErrorの場合はローディング状態を維持
          if (error instanceof Error && error.name === 'AbortError') return;
          storeManager.setData('isFetching', false);
          isRequestInProgress = false;
          storeManager.setData('searchMessages', { error });
        });
    } else {
      storeManager.setData('isFetching', false);
      isRequestInProgress = false;
    }
  }, 300);
})();

/** 初回検索時のデータをリセット */
function _resetSearchResults() {
  storeManager.setData('numberOfRecords', 0);
  storeManager.setData('offset', 0);
  storeManager.setData('rowCount', 0);
  storeManager.setData('isFetching', false);
  storeManager.setData('searchResults', []);
  storeManager.resetColumnWidths();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('results-column-widths-reset'));
  }
  lastRequestRanges.clear(); // データリセット時にクリア
}

/** 検索用 API のエンドポイントを取得 */
function _determineSearchEndpoints(
  offset: number,
  isFirstTime: boolean
): string[] {
  let basePath: string;

  switch (storeManager.getData('searchMode')) {
    case 'simple': {
      // Simple searchの場合のみLIMITでの調整を行う
      const offsetStart = offset - (offset % LIMIT);
      const conditions = qs.stringify(
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

    default:
      return [];
  }
}

/** 結果行のloading解除を統計取得ではなくdata取得に合わせるため、endpointの役割を判定する */
function _isDataRequestEndpoint(endpoint: string): boolean {
  return new URL(endpoint, API_URL).searchParams.get('data') === '1';
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
  const body: Partial<{ offset: number; query: Record<string, unknown> }> = {
    offset: _calculateOffset(storeManager.getData('offset'), LIMIT),
  };

  const advConditions = storeManager.getData('advancedSearchConditions');
  if (advConditions && Object.keys(advConditions as object).length > 0) {
    body.query = stripAdvancedSearchMetadata(advConditions) as Record<string, unknown>;
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

    if (jsonResponse.notice || jsonResponse.warning || jsonResponse.error) {
      storeManager.setData('searchMessages', {
        notice: jsonResponse.notice?.join?.('<br>'),
        warning: jsonResponse.warning?.join?.('<br>'),
        error: jsonResponse.error?.join?.('<br>'),
      });
    } else {
      storeManager.setData('searchMessages', {});
    }
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.name === 'AbortError') {
      // AbortErrorの場合はエラーオブジェクトを投げる
      const abortError = new Error('ABORTED');
      abortError.name = 'AbortError';
      throw abortError;
    }
    throw error;
  }
}

/** HTTP ステータスコードに応じたエラーメッセージを取得 */
function _getErrorMessage(statusCode: number): string {
  const errorTypes: Record<number, string> = {
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
  const rows = Array.isArray(json?.data) ? json.data : [];
  const offset =
    typeof json?.scroll?.offset === 'number' ? json.scroll.offset : 0;

  if (!Array.isArray(json?.data)) {
    console.error('[search] Unexpected result shape (no data array):', json);
  }

  // 実際に取得したデータ件数を下限として numberOfRecords を更新する。
  // max_rows はフィルタ前の件数を返す場合があり、統計レスポンス前に使うと
  // データのない行がローディング表示されてしまうため使用しない。
  // 統計レスポンス（_processStatistics）が正確な総件数を上書きする。
  // 仮想スクロール中は既存の numberOfRecords を保持するため Math.max を使用する。
  const currentCount = storeManager.getData('numberOfRecords');
  storeManager.setData('numberOfRecords', Math.max(currentCount, offset + rows.length));
  storeManager.setResults(rows, offset);
}

/** 統計情報をセット */
function _processStatistics(json: SearchStatistics) {
  // status
  const available = Math.min(json.statistics.filtered, json.scroll.max_rows);
  storeManager.setData('searchStatus', {
    available,
    filtered: json.statistics.filtered,
    total: json.statistics.total,
  });
  storeManager.setData('numberOfRecords', available);

  // statistics
  storeManager.setData('statisticsDataset', json.statistics.dataset); // dataset
  storeManager.setData('statisticsSignificance', json.statistics.significance); // significance
  storeManager.setData('statisticsType', json.statistics.type); // total_variant_type
  storeManager.setData('statisticsConsequence', json.statistics.consequence); // consequence
}

/** 検索状態を更新し、条件が変わっていた場合は再検索 */
async function _updateAppState() {
  // for Download button
  let hasConditions = false;

  switch (storeManager.getData('searchMode')) {
    case 'simple': {
      const simpleConditions = storeManager.getData('simpleSearchConditions');
      const extractedSimpleConditions =
        extractSearchCondition(simpleConditions);
      hasConditions = Object.keys(extractedSimpleConditions).length > 0;
      break;
    }
    case 'advanced': {
      const advancedConditions = storeManager.getData(
        'advancedSearchConditions'
      );
      hasConditions = Boolean(
        advancedConditions && Object.keys(advancedConditions).length > 0
      );
      break;
    }
  }

  const filteredCount = storeManager.getData('searchStatus')?.filtered ?? 0;
  const isDownloadAvailable =
    hasConditions && filteredCount <= DOWNLOAD_VARIANT_LIMIT;
  const isDownloadLimitExceeded =
    hasConditions && filteredCount > DOWNLOAD_VARIANT_LIMIT;
  const downloadDisabledReason = _getDownloadDisabledReason(
    hasConditions,
    isDownloadLimitExceeded
  );

  document.body.toggleAttribute('data-download-available', isDownloadAvailable);
  _updateDownloadButtonState(isDownloadAvailable, isDownloadLimitExceeded);
  _updateDownloadDisabledReasonMessage(downloadDisabledReason);

  // searchResults を publish し表示を更新する。
  // offset/rowCount/numberOfRecords の同期はそれぞれの setData が publish 済みのため不要。
  storeManager.publish('searchResults');

  // 最後にステータスを更新
  storeManager.setData('appStatus', 'normal');
}

/** ダウンロードボタンの有効/無効状態を更新 */
function _updateDownloadButtonState(
  isDownloadAvailable: boolean,
  isDownloadLimitExceeded: boolean
) {
  document
    .querySelectorAll('.download-buttons .button-view')
    .forEach((button) => {
      button.classList.toggle('-disabled', !isDownloadAvailable);
      button.setAttribute('aria-disabled', String(!isDownloadAvailable));
      if (button instanceof HTMLButtonElement) {
        button.disabled = !isDownloadAvailable;
      }
      if (isDownloadLimitExceeded) {
        button.setAttribute('title', DOWNLOAD_LIMIT_TITLE);
      } else {
        button.removeAttribute('title');
      }
    });
}

function _getDownloadDisabledReason(
  hasConditions: boolean,
  isDownloadLimitExceeded: boolean
): string {
  if (!hasConditions) {
    return 'Add a search condition to enable download.';
  }

  if (isDownloadLimitExceeded) {
    return DOWNLOAD_LIMIT_TITLE;
  }

  return '';
}

function _updateDownloadDisabledReasonMessage(message: string): void {
  const reasonNode = document.getElementById('DownloadDisabledReason');
  if (!reasonNode) {
    return;
  }

  reasonNode.textContent = message;
  const shouldHide = message === '';
  reasonNode.toggleAttribute('hidden', shouldHide);
  reasonNode
    .closest('.download-disabled-reason-item')
    ?.toggleAttribute('hidden', shouldHide);
}
