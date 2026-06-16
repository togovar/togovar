import { storeManager } from '../store/StoreManager';
import debounce from 'lodash/debounce';
import type { FetchOption } from '../types';
import {
  finishSearchWithoutRequests,
  startSearchRequestLoading,
  type SearchRequest,
  watchSearchRequestCompletion,
} from './searchCompletion';
import { fetchSearchJSON } from './searchFetch';
import { applySearchMessages } from './searchMessages';
import {
  determineSearchEndpoints,
  getSearchRequestOptions,
} from './searchRequest';
import { applySearchResponse } from './searchResponse';
import {
  clearSearchRequestRanges,
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
  const requests = _createSearchRequests(apiEndpoints, requestOptions);

  // データ取得
  if (requests.length > 0) {
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

/**
 * endpoint生成とfetch開始の接続点を名前で示し、executeSearch本体を検索フローだけに集中させる。
 */
function _createSearchRequests(
  endpoints: string[],
  options: FetchOption
): SearchRequest[] {
  return endpoints.map((endpoint) => ({
    endpoint,
    promise: _fetchData(endpoint, options),
  }));
}

/** 通信結果の反映先をendpoint種別で分け、検索フローからレスポンス詳細を隠す。 */
async function _fetchData(endpoint: string, options: FetchOption) {
  const jsonResponse = await fetchSearchJSON(endpoint, options);
  applySearchResponse(endpoint, jsonResponse);
  applySearchMessages(jsonResponse);
}
