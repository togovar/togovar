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

/** 検索開始の入口を1つにし、連続操作時のAPI多重発火をdebounceで抑える。 */
export const executeSearch = (() => {
  return debounce((offset = 0, isFirstTime = false) => {
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
          markSearchRequestFinished();
          _updateAppState();
        })
        .catch((error) => {
          // AbortErrorは次の検索がisSearchDataFetchingを引き継ぐため、古いリクエスト側では解除しない。
          if (error instanceof Error && error.name === 'AbortError') return;
          storeManager.setData('isSearchDataFetching', false);
          markSearchRequestFinished();
          storeManager.setData('searchMessages', { error });
        });
    } else {
      storeManager.setData('isSearchDataFetching', false);
      markSearchRequestFinished();
    }
  }, 300);
})();

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

/** 全リクエスト完了後に表示更新を確定させ、画面全体のloadingを終了する。 */
async function _updateAppState() {
  // searchResults を publish し表示を更新する。
  // offset/rowCount/numberOfRecords の同期はそれぞれの setData が publish 済みのため不要。
  storeManager.publish('searchResults');

  // 最後にステータスを更新
  storeManager.setData('appLoadingStatus', 'normal');
}
