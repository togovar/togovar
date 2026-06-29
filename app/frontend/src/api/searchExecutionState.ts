import { storeManager } from '../store/StoreManager';
import { SEARCH_RESULT_LIMIT } from './searchRequest';

type ActiveSearchMode = 'simple' | 'advanced' | null;
export type SearchOrigin = 'user' | 'history' | 'system' | 'pagination';

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
  searchOrigin: SearchOrigin;
  executionId: number;
  isSearchRequestInProgress: boolean;
  requestedRanges: Set<string>;
};

const searchExecutionState: SearchExecutionState = {
  abortController: null,
  searchMode: null,
  searchOrigin: 'system',
  executionId: 0,
  isSearchRequestInProgress: false,
  requestedRanges: new Set<string>(),
};

/**
 * 検索実行前のキャンセル・重複range判定を一箇所に集め、searchExecutor.tsの分岐を減らす。
 */
export function prepareSearchExecution(
  offset: number,
  isInitialSearchRequested: boolean,
  searchOrigin: SearchOrigin
): SearchExecutionPreparation {
  if (searchExecutionState.isSearchRequestInProgress && !isInitialSearchRequested) {
    return { shouldExecute: false, isFirstTime: isInitialSearchRequested };
  }

  let shouldResetForInitialSearch = isInitialSearchRequested;
  const newSearchMode = storeManager.getData('searchMode');

  abortCurrentSearchRequest();

  if (hasSearchModeChanged(newSearchMode)) {
    shouldResetForInitialSearch = true;
    clearSearchRequestRanges();
  } else if (isSimpleSearchRangeAlreadyRequested(offset, newSearchMode)) {
    return { shouldExecute: false, isFirstTime: shouldResetForInitialSearch };
  } else {
    registerSimpleSearchRange(offset, newSearchMode);
  }

  searchExecutionState.searchMode = newSearchMode || null;
  searchExecutionState.searchOrigin = searchOrigin;
  searchExecutionState.abortController = new AbortController();
  searchExecutionState.executionId += 1;

  return {
    shouldExecute: true,
    isFirstTime: shouldResetForInitialSearch,
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
 * 1件自動遷移をユーザー操作の検索だけに限定するため、現在の検索発火元を公開する。
 */
export function getCurrentSearchOrigin(): SearchOrigin {
  return searchExecutionState.searchOrigin;
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
export function isSearchAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'AbortError'
  );
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
 * simple検索で同じページ範囲がすでに取得済みかを確認する（副作用なし）。
 */
function isSimpleSearchRangeAlreadyRequested(
  offset: number,
  searchMode: string
): boolean {
  if (searchMode !== 'simple') return false;
  return searchExecutionState.requestedRanges.has(getSimpleSearchRangeKey(offset));
}

/**
 * simple検索のページ範囲を取得済みとして登録する。
 */
function registerSimpleSearchRange(offset: number, searchMode: string): void {
  if (searchMode !== 'simple') return;
  searchExecutionState.requestedRanges.add(getSimpleSearchRangeKey(offset));
}

/**
 * simple検索のoffset揺れを同じページ単位へ丸め、取得済みrange判定を安定させる。
 */
function getSimpleSearchRangeKey(offset: number): string {
  const offsetStart = offset - (offset % SEARCH_RESULT_LIMIT);
  return `${offsetStart}-${offsetStart + SEARCH_RESULT_LIMIT}`;
}
