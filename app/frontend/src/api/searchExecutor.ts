import debounce from 'lodash/debounce';
import type { FetchOption } from '../types';
import { storeManager } from '../store/StoreManager';
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
  isCurrentSearchExecution,
  prepareSearchExecution,
  resetSearchExecutionForNewSearch,
} from './searchExecutionState';

/** 検索開始の入口を1つにし、連続操作時のAPI多重発火をdebounceで抑える。 */
export const executeSearch = debounce(executeSearchImpl, 300);

/**
 * debounceの外へ実処理を出し、検索準備・API起動・完了監視の流れを追いやすくする。
 */
function executeSearchImpl(offset = 0, isFirstTime = false): void {
  const execution = prepareSearchExecution(offset, isFirstTime);
  if (!execution.shouldExecute) return;

  const searchRun = prepareSearchRun(offset, execution);
  runSearchRequests(searchRun.requests, searchRun.executionId);
}

/**
 * 検索1回分の実行材料をここでまとめ、executeSearchImpl本体を開始判定だけに集中させる。
 */
function prepareSearchRun(
  offset: number,
  execution: Extract<
    ReturnType<typeof prepareSearchExecution>,
    { shouldExecute: true }
  >
): {
  executionId: number;
  requests: SearchRequest[];
} {
  if (execution.isFirstTime) {
    resetSearchExecutionForNewSearch();
  }

  startSearchRequestLoading();

  const searchMode = storeManager.getData('searchMode');
  const apiEndpoints = determineSearchEndpoints(
    searchMode,
    offset,
    execution.isFirstTime,
    storeManager.getData('simpleSearchConditions'),
    storeManager.getData('simpleSearchConditionsMaster')
  );
  const requestOptions = getSearchRequestOptions(
    searchMode,
    storeManager.getData('offset'),
    storeManager.getData('advancedSearchConditions'),
    execution.signal
  );

  return {
    executionId: execution.executionId,
    requests: createSearchRequests(
      apiEndpoints,
      requestOptions,
      execution.executionId
    ),
  };
}

/**
 * 実行準備済みのrequest群をここで完了監視へ渡し、空検索時の終了処理も同じ入口に揃える。
 */
function runSearchRequests(
  requests: SearchRequest[],
  executionId: number
): void {
  if (requests.length > 0) {
    watchSearchRequestCompletion(requests, executionId);
    return;
  }

  finishSearchWithoutRequests(executionId);
}

/**
 * endpoint生成とfetch開始の接続点を名前で示し、executeSearch本体を検索フローだけに集中させる。
 */
function createSearchRequests(
  endpoints: string[],
  options: FetchOption,
  executionId: number
): SearchRequest[] {
  return endpoints.map((endpoint) => ({
    endpoint,
    promise: fetchData(endpoint, options, executionId),
  }));
}

/** 通信結果の反映先をendpoint種別で分け、検索フローからレスポンス詳細を隠す。 */
async function fetchData(
  endpoint: string,
  options: FetchOption,
  executionId: number
) {
  const jsonResponse = await fetchSearchJSON(endpoint, options);
  applySearchResponse(endpoint, jsonResponse, executionId);
  if (isCurrentSearchExecution(executionId)) {
    applySearchMessages(jsonResponse);
  }
}
