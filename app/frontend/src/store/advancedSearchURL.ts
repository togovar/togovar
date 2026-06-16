import type { ConditionQuery } from '../types/condition';

/** Advanced Search条件のURLエンコード上限（Raw JSON文字数） */
export const ADVANCED_SEARCH_URL_MAX_JSON_LENGTH = 2000;

/**
 * Advanced Search条件をURLの `q` パラメータ用にエンコードする。
 * JSON.stringify → btoa (Base64) の順で変換する。
 * Raw JSONが上限を超える、またはエンコードに失敗した場合は null を返す。
 */
export function encodeConditionForURL(query: unknown): string | null {
  try {
    const json = JSON.stringify(query);
    if (typeof json !== 'string') return null;
    if (json.length > ADVANCED_SEARCH_URL_MAX_JSON_LENGTH) return null;
    return btoa(json);
  } catch {
    return null;
  }
}

/**
 * URLの `q` パラメータをAdvanced Search条件にデコードする。
 * 既存のURL互換のため、`+` が空白に変換されたケースも補正する。
 */
export function decodeConditionFromURL(
  encoded: string
): ConditionQuery | null {
  try {
    const parsed = JSON.parse(atob(encoded.replace(/ /g, '+')));
    // 配列やプリミティブはAPIのquery bodyに流れると不正リクエストになるため弾く。
    return isPlainObject(parsed) ? (parsed as ConditionQuery) : null;
  } catch {
    return null;
  }
}

/**
 * URL/画面復元用のメタ情報を取り除き、検索APIへ送れるqueryだけにする。
 * 現在はGene symbolの表示名(labels)だけが対象。
 */
export function stripAdvancedSearchMetadata(query: unknown): unknown {
  if (Array.isArray(query)) {
    return query.map((item) => stripAdvancedSearchMetadata(item));
  }

  if (!isPlainObject(query)) return query;

  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(query)) {
    if (key === 'labels') continue;
    next[key] = stripAdvancedSearchMetadata(value);
  }
  return next;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
