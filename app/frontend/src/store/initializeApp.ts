import { storeManager } from './StoreManager';
import { decodeConditionFromURL } from './advancedSearchURL';

/**
 * URLのクエリパラメータを解析してストアへ反映し、検索モードを返す。
 * searchModeはここでセットしない。StoreManager.searchMode()サブスクライバが
 * executeSearchを発火するため、条件がストアに揃ってから呼び出し元でセットする。
 */
export function initializeApp(): 'simple' | 'advanced' {
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
