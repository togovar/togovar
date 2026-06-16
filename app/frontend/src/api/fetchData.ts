import { storeManager } from '../store/StoreManager';
import debounce from 'lodash/debounce';
import type { FetchOption } from '../types';
import { fetchSearchJSON } from './searchFetch';
import { applySearchMessages } from './searchMessages';
import {
  determineSearchEndpoints,
  getSearchRequestOptions,
  isDataRequestEndpoint,
} from './searchRequest';
import {
  applySearchResultsResponse,
  applySearchStatisticsResponse,
} from './searchResponse';
import {
  clearSearchRequestRanges,
  getCurrentSearchMode,
  markSearchRequestFinished,
  markSearchRequestStarted,
  prepareSearchExecution,
} from './searchExecutionState';

type SearchRequest = {
  endpoint: string;
  promise: Promise<void>;
};

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
  storeManager.setData('isSearchDataFetching', true);
  markSearchRequestStarted();

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
    _watchSearchRequestCompletion(requests);
  } else {
    _finishSearchDataLoading();
    _finishSearchSuccessfully();
  }
}

/** 初回検索を過去結果から独立させるため、結果Storeとスクロール取得範囲を初期化する。 */
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

/**
 * data取得と全体完了を別々に監視し、行loadingと画面全体loadingの責務を混ぜない。
 */
function _watchSearchRequestCompletion(requests: SearchRequest[]): void {
  const dataRequests = requests
    .filter(({ endpoint }) => isDataRequestEndpoint(endpoint))
    .map(({ promise }) => promise);

  _watchSearchDataCompletion(dataRequests);
  _watchAllSearchRequestsCompletion(requests.map(({ promise }) => promise));
}

/**
 * Resultsの行loadingはdata=1レスポンスだけに連動させ、統計取得の遅延から切り離す。
 */
function _watchSearchDataCompletion(dataRequests: Promise<void>[]): void {
  Promise.all(dataRequests)
    .then(() => {
      _finishSearchDataLoading();
    })
    .catch((error: unknown) => {
      if (_isAbortError(error)) return;
      _finishSearchDataLoading();
    });
}

/**
 * 画面全体の検索完了はdata/statすべてを待ち、統計パネルまで更新された状態で確定する。
 */
function _watchAllSearchRequestsCompletion(requests: Promise<void>[]): void {
  Promise.all(requests)
    .then(() => {
      _finishSearchSuccessfully();
    })
    .catch((error: unknown) => {
      _handleSearchRequestFailure(error);
    });
}

/**
 * 行loadingの終了条件を1箇所に寄せ、data取得完了と失敗時の扱いを揃える。
 */
function _finishSearchDataLoading(): void {
  storeManager.setData('isSearchDataFetching', false);
}

/**
 * 正常完了時だけ検索実行ロックを解除し、古いAbort済み検索が新しい検索状態を壊さないようにする。
 */
function _finishSearchSuccessfully(): void {
  markSearchRequestFinished();
  _updateAppState();
}

/**
 * Abort以外の失敗だけを現在の検索失敗として扱い、UIのloadingとメッセージを確定する。
 */
function _handleSearchRequestFailure(error: unknown): void {
  // AbortErrorは次の検索がloading状態を引き継ぐため、古いリクエスト側では何もしない。
  if (_isAbortError(error)) return;

  _finishSearchDataLoading();
  markSearchRequestFinished();
  storeManager.setData('searchMessages', { error: _getSearchErrorMessage(error) });
}

/**
 * 中断された古い検索を通常エラーから分け、新しい検索のloading状態を誤って消さない。
 */
function _isAbortError(error: unknown): error is Error {
  return error instanceof Error && error.name === 'AbortError';
}

/**
 * Storeの検索メッセージは文字列だけを扱うため、未知の例外値を表示可能な形へ丸める。
 */
function _getSearchErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** 全リクエスト完了後に表示更新を確定させ、画面全体のloadingを終了する。 */
async function _updateAppState() {
  // searchResults を publish し表示を更新する。
  // offset/rowCount/numberOfRecords の同期はそれぞれの setData が publish 済みのため不要。
  storeManager.publish('searchResults');

  // 最後にステータスを更新
  storeManager.setData('appLoadingStatus', 'normal');
}
