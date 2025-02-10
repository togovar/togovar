import StoreManager from './StoreManager';

export function initializeApp() {
  const searchParams = new URLSearchParams(window.location.search);
  const urlMode = searchParams.get('mode');

  // URLのモードパラメータに基づいて検索モードを設定
  if (urlMode === 'advanced') {
    StoreManager.setData('searchMode', 'advanced');
    console.log('searchMode', 'advanced');
  } else {
    StoreManager.setData('searchMode', 'simple');
    console.log('searchMode', 'simple');
  }
}
