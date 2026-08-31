import type { ConditionQuery } from '../../types/query';
import {
  base64ToBytes,
  bytesToBase64,
  decodeCompressedURLToJSON,
  encodeJSONToCompressedURL,
  getFirstString,
  isPlainObject,
  type SearchURLParam,
} from './searchURLCodec';

/** Advanced Search条件のURLエンコード上限（Raw JSON文字数） */
const ADVANCED_SEARCH_URL_MAX_JSON_LENGTH = 2000;
const ADVANCED_SEARCH_COMPRESSION_MIN_LEGACY_LENGTH = 400;

export type AdvancedSearchURLDecodeResult = {
  condition: ConditionQuery | null;
  hasCompressedParam: boolean;
  hasLegacyParam: boolean;
  restoredFromCompressed: boolean;
  restoredFromLegacy: boolean;
};

/**
 * Advanced Search条件をURLの `q` パラメータ用にエンコードする。
 * JSON.stringify → UTF-8 → Base64 の順で変換する。
 * Raw JSONが上限を超える、またはエンコードに失敗した場合は null を返す。
 */
export function encodeConditionForURL(query: unknown): string | null {
  try {
    const json = JSON.stringify(query);
    if (typeof json !== 'string') return null;
    if (json.length > ADVANCED_SEARCH_URL_MAX_JSON_LENGTH) return null;
    return bytesToBase64(new TextEncoder().encode(json));
  } catch {
    return null;
  }
}

/**
 * Advanced Search条件を共有URLへ載せるため、短い条件は従来Base64、長い条件は圧縮Base64URLを優先する。
 */
export async function encodeConditionForBestURL(
  query: unknown
): Promise<SearchURLParam | null> {
  const legacy = encodeConditionForURL(query);
  if (
    legacy !== null &&
    legacy.length <= ADVANCED_SEARCH_COMPRESSION_MIN_LEGACY_LENGTH
  ) {
    return { name: 'q', value: legacy };
  }

  const compressed = await encodeConditionForCompressedURL(query);

  if (legacy === null && compressed === null) return null;
  if (legacy === null) return { name: 'qz', value: compressed! };
  if (compressed === null || legacy.length <= compressed.length) {
    return { name: 'q', value: legacy };
  }
  return { name: 'qz', value: compressed };
}

/**
 * URL長を抑えるため、Compression Streams API対応ブラウザではJSONをdeflate-raw圧縮してBase64URL化する。
 */
async function encodeConditionForCompressedURL(
  query: unknown
): Promise<string | null> {
  return encodeJSONToCompressedURL(query);
}

/**
 * URLの `q` パラメータをAdvanced Search条件にデコードする。
 * 既存のURL互換のため、`+` が空白に変換されたケースも補正する。
 */
export function decodeConditionFromURL(
  encoded: string
): ConditionQuery | null {
  try {
    const parsed = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(base64ToBytes(encoded))
    );
    // 配列・プリミティブはAPIのquery bodyに流れると不正リクエストになるため弾く。
    // 空オブジェクトは「条件なし」センチネル(undefined)と整合させるため null を返す。
    if (!isPlainObject(parsed) || Object.keys(parsed).length === 0) return null;
    return parsed as ConditionQuery;
  } catch {
    return decodeLegacyLatin1ConditionFromURL(encoded);
  }
}

/**
 * 既存共有URLはbtoa(JSON文字列)で作られているため、UTF-8復元に失敗した場合だけ旧方式を読む。
 */
function decodeLegacyLatin1ConditionFromURL(
  encoded: string
): ConditionQuery | null {
  try {
    const parsed = JSON.parse(atob(encoded.replace(/ /g, '+')));
    if (!isPlainObject(parsed) || Object.keys(parsed).length === 0) return null;
    return parsed as ConditionQuery;
  } catch {
    return null;
  }
}

/**
 * qz復元失敗時にUI警告を出すため、条件本体だけでなく復元経路も返す。
 */
export async function decodeConditionFromURLParamsWithStatus(params: {
  q?: unknown;
  qz?: unknown;
}): Promise<AdvancedSearchURLDecodeResult> {
  const compressed = getFirstString(params.qz);
  const legacy = getFirstString(params.q);

  if (compressed) {
    const condition = await decodeCompressedConditionFromURL(compressed);
    if (condition !== null) {
      return {
        condition,
        hasCompressedParam: true,
        hasLegacyParam: legacy !== undefined,
        restoredFromCompressed: true,
        restoredFromLegacy: false,
      };
    }
  }

  const legacyCondition = legacy ? decodeConditionFromURL(legacy) : null;
  return {
    condition: legacyCondition,
    hasCompressedParam: compressed !== undefined,
    hasLegacyParam: legacy !== undefined,
    restoredFromCompressed: false,
    restoredFromLegacy: legacyCondition !== null,
  };
}

/**
 * q/qzいずれかを含む共有URLがどの経路でも復元できなかった場合だけ、ユーザーへ警告する。
 */
export function shouldWarnAdvancedSearchURLRestoreFailure(
  result: AdvancedSearchURLDecodeResult
): boolean {
  return (
    (result.hasCompressedParam || result.hasLegacyParam) &&
    !result.restoredFromCompressed &&
    !result.restoredFromLegacy
  );
}

/**
 * qzは圧縮済みバイト列のBase64URL表現なので、Base64URL復元後に展開してJSONとして読む。
 */
async function decodeCompressedConditionFromURL(
  encoded: string
): Promise<ConditionQuery | null> {
  const parsed = await decodeCompressedURLToJSON(
    encoded,
    'Decompressed Advanced Search URL is too large.'
  );
  if (!isPlainObject(parsed) || Object.keys(parsed).length === 0) return null;
  return parsed as ConditionQuery;
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
