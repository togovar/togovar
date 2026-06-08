/** Advanced Search条件のURLエンコード上限（Raw JSON文字数） */
export const ADVANCED_SEARCH_URL_MAX_JSON_LENGTH = 2000;

/**
 * Advanced Search条件をURLの `q` パラメータ用にエンコードする。
 * JSON.stringify → btoa (Base64) の順で変換する。
 * Raw JSONが上限を超える場合は null を返す。
 */
export function encodeConditionForURL(query: unknown): string | null {
  const json = JSON.stringify(query);
  if (json.length > ADVANCED_SEARCH_URL_MAX_JSON_LENGTH) return null;
  return btoa(json);
}

/**
 * URLの `q` パラメータをAdvanced Search条件にデコードする。
 * 既存のURL互換のため、`+` が空白に変換されたケースも補正する。
 */
export function decodeConditionFromURL(encoded: string): unknown | null {
  try {
    return JSON.parse(atob(encoded.replace(/ /g, '+')));
  } catch {
    return null;
  }
}
