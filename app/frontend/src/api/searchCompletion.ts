import { storeManager } from '../store/StoreManager';
import {
  isSearchAbortError,
  isCurrentSearchExecution,
  markSearchRequestFinished,
  markSearchRequestStarted,
} from './searchExecutionState';
import { isDataRequestEndpoint } from './searchRequest';

export type SearchRequest = {
  endpoint: string;
  promise: Promise<void>;
};

/**
 * data取得開始と追加取得ロック開始を同時に行い、開始/完了のloading制御を同じ場所へ寄せる。
 */
export function startSearchRequestLoading(): void {
  storeManager.setData('isSearchDataFetching', true);
  markSearchRequestStarted();
}

/**
 * data取得と全体完了を別々に監視し、行loadingと画面全体loadingの責務を混ぜない。
 */
export function watchSearchRequestCompletion(
  requests: SearchRequest[],
  executionId: number
): void {
  const requestGroups = splitSearchRequestsByResponseType(requests);
  watchSearchDataCompletion(requestGroups.dataRequests, executionId);
  watchAllSearchRequestsCompletion(requestGroups.allRequests, executionId);
}

/**
 * endpointが生成されない検索でも完了状態を揃えるため、空検索の終了処理を共通化する。
 */
export function finishSearchWithoutRequests(executionId: number): void {
  if (!isCurrentSearchExecution(executionId)) return;
  finishSearchDataLoading();
  finalizeSearchSuccess(executionId);
}

/**
 * Resultsの行loadingはdata=1レスポンスだけに連動させ、統計取得の遅延から切り離す。
 */
function watchSearchDataCompletion(
  dataRequests: Promise<void>[],
  executionId: number
): void {
  onRequestsSettled(dataRequests, (results) => {
    if (!isCurrentSearchExecution(executionId)) return;
    if (isOnlyAbortFailure(results)) return;
    finishSearchDataLoading();
  });
}

/**
 * 画面全体の検索完了はdata/statすべてを待ち、統計パネルまで更新された状態で確定する。
 */
function watchAllSearchRequestsCompletion(
  requests: Promise<void>[],
  executionId: number
): void {
  onRequestsSettled(requests, (results) => {
    if (!isCurrentSearchExecution(executionId)) return;

    const failedResult = getFirstNonAbortFailure(results);
    if (failedResult) {
      finalizeSearchFailure(failedResult.reason);
      return;
    }

    finalizeSearchSuccess(executionId);
  });
}

/**
 * 行loadingの終了条件を1箇所に寄せ、data取得完了と失敗時の扱いを揃える。
 */
function finishSearchDataLoading(): void {
  storeManager.setData('isSearchDataFetching', false);
}

/**
 * 正常完了時だけ検索実行ロックを解除し、古いAbort済み検索が新しい検索状態を壊さないようにする。
 */
function finalizeSearchSuccess(executionId: number): void {
  if (!isCurrentSearchExecution(executionId)) return;
  markSearchRequestFinished();
  storeManager.publish('searchResults');
  storeManager.setData('appLoadingStatus', 'normal');
}

/**
 * Abort以外の失敗だけを現在の検索失敗として扱い、UIのloadingとメッセージを確定する。
 */
function finalizeSearchFailure(error: unknown): void {
  finishSearchDataLoading();
  markSearchRequestFinished();
  storeManager.setData('searchMessages', { error: getSearchErrorMessage(error) });
  storeManager.setData('appLoadingStatus', 'normal');
}

/**
 * data系と全体完了系で同じPromise配列の待機方法を共有し、Abortや失敗の判定基準を揃える。
 */
function onRequestsSettled(
  requests: Promise<void>[],
  onSettled: (results: PromiseSettledResult<void>[]) => void
): void {
  Promise.allSettled(requests).then(onSettled);
}

/**
 * data取得完了監視ではAbortだけの失敗を次検索への切替とみなし、旧検索側でloadingを触らない。
 */
function isOnlyAbortFailure(
  results: PromiseSettledResult<void>[]
): boolean {
  return (
    results.some((result) => result.status === 'rejected') &&
    results.every(
      (result) =>
        result.status === 'fulfilled' ||
        isSearchAbortError(result.reason)
    )
  );
}

/**
 * 全体完了時は最初の実エラーだけを拾い、Abortを除いた失敗だけをUIエラーとして扱う。
 */
function getFirstNonAbortFailure(
  results: PromiseSettledResult<void>[]
): PromiseRejectedResult | null {
  return (
    results.find(
      (result): result is PromiseRejectedResult =>
        result.status === 'rejected' && !isSearchAbortError(result.reason)
    ) ?? null
  );
}

/**
 * data系と全体完了系で同じ抽出ロジックを使い、endpoint判定の責務を呼び出し側へ漏らさない。
 */
function splitSearchRequestsByResponseType(requests: SearchRequest[]): {
  dataRequests: Promise<void>[];
  allRequests: Promise<void>[];
} {
  return {
    dataRequests: requests
      .filter(({ endpoint }) => isDataRequestEndpoint(endpoint))
      .map(({ promise }) => promise),
    allRequests: requests.map(({ promise }) => promise),
  };
}

/**
 * Storeの検索メッセージは文字列だけを扱うため、未知の例外値を表示可能な形へ丸める。
 */
function getSearchErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
