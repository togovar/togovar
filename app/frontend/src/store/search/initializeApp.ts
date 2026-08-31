import { storeManager } from '../StoreManager';
import {
  ADVANCED_SEARCH_URL_RESTORE_WARNING,
  decodeConditionFromURLParamsWithStatus,
  shouldWarnAdvancedSearchURLRestoreFailure,
  type AdvancedSearchURLDecodeResult,
} from './advancedSearchURL';
import { initSearchHandlers } from './searchManager';

/**
 * URLのクエリパラメータを解析してストアへ反映し、検索モードを返す。
 * searchModeはここでセットしない。条件がストアに揃った後で呼び出し元がセットし、
 * Store内部リセット後にsearchManager側の副作用ハンドラが検索を開始する。
 */
export async function initializeApp(): Promise<'simple' | 'advanced'> {
  // searchMode subscriber と popstate リスナーを登録する。
  // storeManager.setSearchModeFromHistory() が呼ばれる前に必ず実行する必要がある。
  initSearchHandlers();
  const searchParams = new URLSearchParams(window.location.search);
  const urlMode = searchParams.get('mode');

  if (urlMode === 'advanced') {
    const result = await decodeConditionFromURLParamsWithStatus({
      q: searchParams.get('q'),
      qz: searchParams.get('qz'),
    });
    updateAdvancedSearchURLRestoreWarning(result);
    const condition = result.condition;
    if (condition !== null) {
      storeManager.setData('advancedSearchConditions', condition);
      storeManager.setData('advancedSearchRestoredFromURL', true);
    }
    return 'advanced';
  } else {
    return 'simple';
  }
}

/**
 * Advanced Searchのqz共有URLが復元できなかった場合、空条件で黙って検索されないよう警告を残す。
 */
export function updateAdvancedSearchURLRestoreWarning(
  result: AdvancedSearchURLDecodeResult
): void {
  const shouldWarn = shouldWarnAdvancedSearchURLRestoreFailure(result);
  storeManager.setData(
    'searchURLRestoreWarning',
    shouldWarn ? ADVANCED_SEARCH_URL_RESTORE_WARNING : undefined
  );
}
