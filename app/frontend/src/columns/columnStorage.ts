import { getDefaultColumnConfigs, normalizeColumnConfigs } from '.';
import type { StoreState } from '../types';

const COLUMNS_STORAGE_KEY = 'columns';

/**
 * localStorageから列設定を復元する。
 * SSRや壊れたデータに備えてデフォルト値へのフォールバックを保証する。
 * localStorage自体のアクセスが例外を投げる環境があるためtry/catchで保護している。
 */
export function loadColumnsFromStorage(): StoreState['columns'] {
  const fallback = getDefaultColumnConfigs();

  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return fallback;
    }

    const raw = window.localStorage.getItem(COLUMNS_STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;

    return normalizeColumnConfigs(parsed);
  } catch (_error) {
    return fallback;
  }
}

/**
 * 列設定をlocalStorageに保存する。
 * localStorage容量超過やプライベートブラウズでの書き込み失敗を許容する。
 * 保存できなくてもUIは動作するためエラーを握り潰して継続する。
 */
export function saveColumnsToStorage(columns: StoreState['columns']): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;

    window.localStorage.setItem(
      COLUMNS_STORAGE_KEY,
      JSON.stringify(normalizeColumnConfigs(columns))
    );
  } catch (_error) {
    // localStorage制限超過やプライベートブラウズ環境では保存失敗を許容
  }
}
