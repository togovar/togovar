import { storeManager } from './StoreManager';
import { decodeConditionFromURL } from './advancedSearchURL';
import { initSearchHandlers } from './searchManager';

/**
 * URLのクエリパラメータを解析してストアへ反映し、検索モードを返す。
 * searchModeはここでセットしない。条件がストアに揃った後で呼び出し元がセットし、
 * Store内部リセット後にsearchManager側の副作用ハンドラが検索を開始する。
 */
export function initializeApp(): 'simple' | 'advanced' {
  // searchMode subscriber と popstate リスナーを登録する。
  // storeManager.setSearchModeFromHistory() が呼ばれる前に必ず実行する必要がある。
  initSearchHandlers();
  const searchParams = new URLSearchParams(window.location.search);
  const urlMode = searchParams.get('mode');

  if (urlMode === 'advanced') {
    const encodedCondition = searchParams.get('q');
    if (encodedCondition) {
      const condition = decodeConditionFromURL(encodedCondition);
      if (condition !== null) {
        storeManager.setData('advancedSearchConditions', condition);
        storeManager.setData('advancedSearchRestoredFromURL', true);
      }
    }
    return 'advanced';
  } else {
    return 'simple';
  }
}
