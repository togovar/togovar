import { storeManager } from '../store/StoreManager';
import debounce from 'lodash/debounce';
import type { FetchOption } from '../types';
import {
  finishSearchWithoutRequests,
  startSearchRequestLoading,
  watchSearchRequestCompletion,
} from './searchCompletion';
import { fetchSearchJSON } from './searchFetch';
import { applySearchMessages } from './searchMessages';
import {
  determineSearchEndpoints,
  getSearchRequestOptions,
} from './searchRequest';
import {
  applySearchResultsResponse,
  applySearchStatisticsResponse,
} from './searchResponse';
import {
  clearSearchRequestRanges,
  getCurrentSearchMode,
  prepareSearchExecution,
} from './searchExecutionState';

/** 検索開始の入口を1つにし、連続操作時のAPI多重発火をdebounceで抑える。 */
export const executeSearch = debounce(_executeSearch, 300);

/**
 * debounceの外へ実処理を出し、検索準備・API起動・完了監視の流れを追いやすくする。
 */
function _executeSearch(offset = 0, isFirstTime = false): void {
  const execution = prepareSearchExecution(offset, isFirstTime);
  if (!execution.shouldExecute) {
    return;
  }
  isFirstTime = execution.isFirstTime;
  const signal = execution.signal;

  // 初回検索時のデータリセット
  if (isFirstTime) {
    _resetSearchResults();
  }

  // Resultsの行loadingは検索結果dataの取得中だけに連動させる。
  // 統計取得の遅延で行loadingが残らないよう、解除はdata=1リクエスト完了時に行う。
  startSearchRequestLoading();

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
    watchSearchRequestCompletion(requests);
  } else {
    finishSearchWithoutRequests();
  }
}

/** 初回検索を過去結果から独立させるため、結果Storeとスクロール取得範囲を初期化する。 */
function _resetSearchResults() {
  storeManager.resetSearchResultsForNewSearch();
  clearSearchRequestRanges();
}

/** 通信結果の反映先をendpoint種別で分け、検索フローからレスポンス詳細を隠す。 */
async function _fetchData(endpoint: string, options: FetchOption) {
  const jsonResponse = await fetchSearchJSON(endpoint, options);
  const url = new URL(endpoint);
  const queryParams = Object.fromEntries(url.searchParams.entries());

  // 現在の検索モードと一致する場合のみ結果を処理
  if (getCurrentSearchMode() === storeManager.getData('searchMode')) {
    if (queryParams.data === '1') {
      applySearchResultsResponse(jsonResponse);
    }
    if (queryParams.stat === '1') {
      applySearchStatisticsResponse(jsonResponse);
    }
  }

  applySearchMessages(jsonResponse);
}
