import { storeManager } from './StoreManager';

export function initializeApp() {
  const searchParams = new URLSearchParams(window.location.search);
  const urlMode = searchParams.get('mode');

  // URLのモードパラメータに基づいて検索モードを設定
  if (urlMode === 'advanced') {
    storeManager.setData('searchMode', 'advanced');
  } else {
    storeManager.setData('searchMode', 'simple');
  }
}
