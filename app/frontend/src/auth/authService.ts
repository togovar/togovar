import { storeManager } from '../store/StoreManager';

/**
 * ヘッダーとデータセット操作の表示を揃えるため、同じ認証ステータス判定をStoreに反映する。
 * localhost環境では実認証を行わず、authクエリでログイン表示を確認できるようにする。
 * 403もログイン済みとして扱うのは、ステージング/本番でステータスエンドポイントへの
 * アクセス権がセッションに関係なく制限される場合があるため。
 */
export async function fetchLoginStatus(): Promise<void> {
  try {
    if (typeof window === 'undefined') {
      storeManager.setData('isLogin', false);
      return;
    }

    if (isLocalDevelopmentHost(window.location.hostname)) {
      // ?auth=login でログイン時UIを確認できるようにする。
      const localAuthPreview = new URLSearchParams(window.location.search).get(
        'auth'
      );
      storeManager.setData('isLogin', localAuthPreview === 'login');
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(`${window.location.origin}/auth/status`, {
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timeoutId);
      throw new Error('Request failed or timed out');
    }

    clearTimeout(timeoutId);

    if (response.status === 200 || response.status === 403) {
      storeManager.setData('isLogin', true);
    } else {
      storeManager.setData('isLogin', false);
    }
  } catch (error) {
    if (typeof window !== 'undefined' && isLocalDevelopmentHost(window.location.hostname)) {
      console.warn('Failed to fetch auth status:', error);
    }
    storeManager.setData('isLogin', false);
  }
}

/**
 * localでは実認証を行わないため、ポートに依存せず開発用ログインプレビューを有効にする。
 */
function isLocalDevelopmentHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}
