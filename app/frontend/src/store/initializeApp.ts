import { storeManager } from './StoreManager';
import { decodeConditionFromURL } from './advancedSearchURL';

export function initializeApp() {
  const searchParams = new URLSearchParams(window.location.search);
  const urlMode = searchParams.get('mode');

  // URLのモードパラメータに基づいて検索モードを設定
  if (urlMode === 'advanced') {
    const encodedCondition = searchParams.get('q');
    if (encodedCondition) {
      const condition = decodeConditionFromURL(encodedCondition);
      if (condition !== null) {
        storeManager.setData('advancedSearchConditions', condition);
        storeManager.setData('advancedSearchRestoredFromURL', true);
      }
    }

    storeManager.setData('searchMode', 'advanced');
  } else {
    storeManager.setData('searchMode', 'simple');
  }
}
