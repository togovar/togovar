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

type SearchExecutionState = {
  abortController: AbortController | null;
  searchMode: ActiveSearchMode;
  executionId: number;
  isSearchRequestInProgress: boolean;
  requestedRanges: Set<string>;
};

const searchExecutionState: SearchExecutionState = {
  abortController: null,
  searchMode: null,
  executionId: 0,
  isSearchRequestInProgress: false,
  requestedRanges: new Set<string>(),
};

/**
 * 検索実行前のキャンセル・重複range判定を一箇所に集め、searchExecutor.tsの分岐を減らす。
 */
export function prepareSearchExecution(
  offset: number,
  requestedFirstTime: boolean
): SearchExecutionPreparation {
  if (searchExecutionState.isSearchRequestInProgress && !requestedFirstTime) {
    return { shouldExecute: false, isFirstTime: requestedFirstTime };
  }

  let isFirstTime = requestedFirstTime;
  const newSearchMode = storeManager.getData('searchMode');

  abortCurrentSearchRequest();

  if (hasSearchModeChanged(newSearchMode)) {
    isFirstTime = true;
    clearSearchRequestRanges();
  } else if (shouldSkipSimpleSearchRange(offset, newSearchMode)) {
    return { shouldExecute: false, isFirstTime };
  }

  searchExecutionState.searchMode = newSearchMode || null;
  searchExecutionState.abortController = new AbortController();
  searchExecutionState.executionId += 1;

  return {
    shouldExecute: true,
    isFirstTime,
    signal: searchExecutionState.abortController.signal,
    executionId: searchExecutionState.executionId,
  };
}

/**
 * レスポンス処理時に古い検索モードの結果を捨てるため、現在の実行モードだけを公開する。
 */
export function getCurrentSearchMode(): ActiveSearchMode {
  return searchExecutionState.searchMode;
}

/**
 * 同一モード内の条件変更でも古いレスポンスを捨てるため、現在の検索世代かを判定する。
 */
export function isCurrentSearchExecution(executionId: number): boolean {
  return executionId === searchExecutionState.executionId;
}

/**
 * 検索リセット時に取得済みrangeも破棄し、次の検索で先頭ページを必ず取り直す。
 */
function clearSearchRequestRanges(): void {
  searchExecutionState.requestedRanges.clear();
}

/**
 * 初回検索を過去結果から独立させるため、表示Storeと取得済みrangeを同時に初期化する。
 */
export function resetSearchExecutionForNewSearch(): void {
  storeManager.resetSearchResultsForNewSearch();
  clearSearchRequestRanges();
}

/**
 * searchExecutor.tsから検索開始を明示し、完了前の追加スクロール取得を抑止する。
 */
export function markSearchRequestStarted(): void {
  searchExecutionState.isSearchRequestInProgress = true;
}

/**
 * 全リクエスト完了または失敗時に、次の検索を受け付けられる状態へ戻す。
 */
export function markSearchRequestFinished(): void {
  searchExecutionState.isSearchRequestInProgress = false;
}

/**
 * Abort済みの古い検索だけを通常エラーから分け、後続検索のloading状態を守る。
 */
export function isSearchAbortError(error: unknown): error is Error {
  return error instanceof Error && error.name === 'AbortError';
}

/**
 * 毎回の再検索で古いfetchを止め、後着レスポンスが新しい検索状態を壊すのを防ぐ。
 */
function abortCurrentSearchRequest(): void {
  searchExecutionState.abortController?.abort();
}

/**
 * モード切替時だけ先頭検索へ強制し、simple/advancedで共有できない取得済みrangeを捨てる。
 */
function hasSearchModeChanged(nextSearchMode: string): boolean {
  return (
    searchExecutionState.searchMode !== null &&
    searchExecutionState.searchMode !== nextSearchMode
  );
}

/**
 * simple検索の仮想スクロールでは同じページ範囲の再取得を避け、連続スクロール時の無駄fetchを減らす。
 */
function shouldSkipSimpleSearchRange(
  offset: number,
  searchMode: string
): boolean {
  if (searchMode !== 'simple') return false;

  const rangeKey = getSimpleSearchRangeKey(offset);
  if (searchExecutionState.requestedRanges.has(rangeKey)) {
    return true;
  }

  searchExecutionState.requestedRanges.add(rangeKey);
  return false;
}

/**
 * simple検索のoffset揺れを同じページ単位へ丸め、取得済みrange判定を安定させる。
 */
function getSimpleSearchRangeKey(offset: number): string {
  const offsetStart = offset - (offset % SEARCH_RESULT_LIMIT);
  return `${offsetStart}-${offsetStart + SEARCH_RESULT_LIMIT}`;
}
