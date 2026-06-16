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
  const dataRequests = requests
    .filter(({ endpoint }) => isDataRequestEndpoint(endpoint))
    .map(({ promise }) => promise);

  watchSearchDataCompletion(dataRequests, executionId);
  watchAllSearchRequestsCompletion(
    requests.map(({ promise }) => promise),
    executionId
  );
}

/**
 * endpointが生成されない検索でも完了状態を揃えるため、空検索の終了処理を共通化する。
 */
export function finishSearchWithoutRequests(executionId: number): void {
  if (!isCurrentSearchExecution(executionId)) return;
  finishSearchDataLoading();
  finishSearchSuccessfully(executionId);
}

/**
 * Resultsの行loadingはdata=1レスポンスだけに連動させ、統計取得の遅延から切り離す。
 */
function watchSearchDataCompletion(
  dataRequests: Promise<void>[],
  executionId: number
): void {
  Promise.all(dataRequests)
    .then(() => {
      if (!isCurrentSearchExecution(executionId)) return;
      finishSearchDataLoading();
    })
    .catch((error: unknown) => {
      if (isSearchAbortError(error)) return;
      if (!isCurrentSearchExecution(executionId)) return;
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
  Promise.all(requests)
    .then(() => {
      finishSearchSuccessfully(executionId);
    })
    .catch((error: unknown) => {
      handleSearchRequestFailure(error, executionId);
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
function finishSearchSuccessfully(executionId: number): void {
  if (!isCurrentSearchExecution(executionId)) return;
  markSearchRequestFinished();
  updateAppState();
}

/**
 * Abort以外の失敗だけを現在の検索失敗として扱い、UIのloadingとメッセージを確定する。
 */
function handleSearchRequestFailure(error: unknown, executionId: number): void {
  // AbortErrorは次の検索がloading状態を引き継ぐため、古いリクエスト側では何もしない。
  if (isSearchAbortError(error)) return;
  if (!isCurrentSearchExecution(executionId)) return;

  finishSearchDataLoading();
  markSearchRequestFinished();
  storeManager.setData('searchMessages', { error: getSearchErrorMessage(error) });
}

/**
 * Storeの検索メッセージは文字列だけを扱うため、未知の例外値を表示可能な形へ丸める。
 */
function getSearchErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * 全リクエスト完了後に表示更新を確定させ、画面全体のloadingを終了する。
 */
function updateAppState(): void {
  // searchResults を publish し表示を更新する。
  // offset/rowCount/numberOfRecords の同期はそれぞれの setData が publish 済みのため不要。
  storeManager.publish('searchResults');

  // 最後にステータスを更新
  storeManager.setData('appLoadingStatus', 'normal');
}
