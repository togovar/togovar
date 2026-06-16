import { storeManager } from '../store/StoreManager';
import debounce from 'lodash/debounce';
import type { FetchOption, SearchResults, SearchStatistics } from '../types';
import {
  determineSearchEndpoints,
  getSearchRequestOptions,
  isDataRequestEndpoint,
  SEARCH_RESULT_LIMIT,
} from './searchRequest';

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
      const offsetStart = offset - (offset % SEARCH_RESULT_LIMIT);
      const rangeKey = `${offsetStart}-${offsetStart + SEARCH_RESULT_LIMIT}`;

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

    // Resultsの行loadingは検索結果dataの取得中だけに連動させる。
    // 統計取得の遅延で行loadingが残らないよう、解除はdata=1リクエスト完了時に行う。
    storeManager.setData('isSearchDataFetching', true);
    isRequestInProgress = true;

    // API のエンドポイントを取得
    const apiEndpoints = determineSearchEndpoints(offset, isFirstTime);

    // API リクエストオプションを設定
    const requestOptions = getSearchRequestOptions(signal);

    // データ取得
    if (apiEndpoints && apiEndpoints.length > 0) {
      const requests = apiEndpoints.map((endpoint) => ({
        endpoint,
        promise: _fetchData(endpoint, requestOptions),
      }));
      const dataRequests = requests
        .filter(({ endpoint }) => isDataRequestEndpoint(endpoint))
        .map(({ promise }) => promise);

      Promise.all(dataRequests)
        .then(() => {
          // Resultsの行loadingは統計ではなくdata=1レスポンスの到着に合わせて解除する。
          storeManager.setData('isSearchDataFetching', false);
        })
        .catch((error) => {
          if (error instanceof Error && error.name === 'AbortError') return;
          storeManager.setData('isSearchDataFetching', false);
        });

      Promise.all(requests.map(({ promise }) => promise))
        .then(() => {
          isRequestInProgress = false;
          _updateAppState();
        })
        .catch((error) => {
          // AbortErrorは次の検索がisSearchDataFetchingを引き継ぐため、古いリクエスト側では解除しない。
          if (error instanceof Error && error.name === 'AbortError') return;
          storeManager.setData('isSearchDataFetching', false);
          isRequestInProgress = false;
          storeManager.setData('searchMessages', { error });
        });
    } else {
      storeManager.setData('isSearchDataFetching', false);
      isRequestInProgress = false;
    }
  }, 300);
})();

/** 初回検索時のデータをリセット */
function _resetSearchResults() {
  storeManager.setData('numberOfRecords', 0);
  storeManager.setData('offset', 0);
  storeManager.setData('rowCount', 0);
  storeManager.setData('isSearchDataFetching', false);
  storeManager.setData('searchResults', []);
  storeManager.resetColumnWidths();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('results-column-widths-reset'));
  }
  lastRequestRanges.clear(); // データリセット時にクリア
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
  storeManager.setData(
    'numberOfRecords',
    Math.max(currentCount, offset + rows.length)
  );
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
  // searchResults を publish し表示を更新する。
  // offset/rowCount/numberOfRecords の同期はそれぞれの setData が publish 済みのため不要。
  storeManager.publish('searchResults');

  // 最後にステータスを更新
  storeManager.setData('appLoadingStatus', 'normal');
}
