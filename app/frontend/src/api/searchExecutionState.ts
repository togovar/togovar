import { storeManager } from '../store/StoreManager';
import { SEARCH_RESULT_LIMIT } from './searchRequest';

type ActiveSearchMode = 'simple' | 'advanced' | null;

type SearchExecutionPreparation =
  | {
      shouldExecute: true;
      isFirstTime: boolean;
      signal: AbortSignal;
      executionId: number;
    }
  | {
      shouldExecute: false;
      isFirstTime: boolean;
    };

let currentAbortController: AbortController | null = null;
let currentSearchMode: ActiveSearchMode = null;
let currentExecutionId = 0;
let isRequestInProgress = false;
const lastRequestRanges = new Set<string>();

/**
 * 検索実行前のキャンセル・重複range判定を一箇所に集め、fetchData.tsの分岐を減らす。
 */
export function prepareSearchExecution(
  offset: number,
  requestedFirstTime: boolean
): SearchExecutionPreparation {
  if (isRequestInProgress && !requestedFirstTime) {
    return { shouldExecute: false, isFirstTime: requestedFirstTime };
  }

  let isFirstTime = requestedFirstTime;
  const newSearchMode = storeManager.getData('searchMode');

  if (currentAbortController) {
    currentAbortController.abort();
  }

  if (currentSearchMode && currentSearchMode !== newSearchMode) {
    currentSearchMode = newSearchMode || null;
    isFirstTime = true;
    clearSearchRequestRanges();
  } else if (storeManager.getData('searchMode') === 'simple') {
    const offsetStart = offset - (offset % SEARCH_RESULT_LIMIT);
    const rangeKey = `${offsetStart}-${offsetStart + SEARCH_RESULT_LIMIT}`;

    if (lastRequestRanges.has(rangeKey)) {
      return { shouldExecute: false, isFirstTime };
    }

    lastRequestRanges.add(rangeKey);
  }

  currentSearchMode = newSearchMode || null;
  currentAbortController = new AbortController();
  currentExecutionId += 1;

  return {
    shouldExecute: true,
    isFirstTime,
    signal: currentAbortController.signal,
    executionId: currentExecutionId,
  };
}

/**
 * レスポンス処理時に古い検索モードの結果を捨てるため、現在の実行モードだけを公開する。
 */
export function getCurrentSearchMode(): ActiveSearchMode {
  return currentSearchMode;
}

/**
 * 同一モード内の条件変更でも古いレスポンスを捨てるため、現在の検索世代かを判定する。
 */
export function isCurrentSearchExecution(executionId: number): boolean {
  return executionId === currentExecutionId;
}

/**
 * 検索リセット時に取得済みrangeも破棄し、次の検索で先頭ページを必ず取り直す。
 */
export function clearSearchRequestRanges(): void {
  lastRequestRanges.clear();
}

/**
 * 初回検索を過去結果から独立させるため、表示Storeと取得済みrangeを同時に初期化する。
 */
export function resetSearchExecutionForNewSearch(): void {
  storeManager.resetSearchResultsForNewSearch();
  clearSearchRequestRanges();
}

/**
 * fetchData.tsから検索開始を明示し、完了前の追加スクロール取得を抑止する。
 */
export function markSearchRequestStarted(): void {
  isRequestInProgress = true;
}

/**
 * 全リクエスト完了または失敗時に、次の検索を受け付けられる状態へ戻す。
 */
export function markSearchRequestFinished(): void {
  isRequestInProgress = false;
}

/**
 * Abort済みの古い検索だけを通常エラーから分け、後続検索のloading状態を守る。
 */
export function isSearchAbortError(error: unknown): error is Error {
  return error instanceof Error && error.name === 'AbortError';
}
