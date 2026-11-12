import { initializeGlobalHeaderDropdowns } from '../src/components/GlobalHeaderDropdowns';

/** ドキュメントやレポートでもヘッダーを操作できるよう、ページ固有の初期化とは独立して起動する。 */
function initializeHeader(): void {
  const cleanup = initializeGlobalHeaderDropdowns();
  window.addEventListener('pagehide', (event) => {
    // bfcache から戻ったときも操作できるよう、キャッシュされる場合はイベントを維持する。
    if (!event.persisted) cleanup();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeHeader, { once: true });
} else {
  initializeHeader();
}
