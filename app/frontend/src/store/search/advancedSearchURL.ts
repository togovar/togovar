import type { ConditionQuery } from '../../types/query';
import {
  base64ToBytes,
  decodeCompressedURLToJSON,
  decodeSearchURLParamsWithStatus,
  encodeJSONToBestURLParam,
  isPlainObject,
  shouldWarnSearchURLRestoreFailure,
  type SearchURLDecodeResult,
  type SearchURLParam,
} from './searchURLCodec';

export type AdvancedSearchURLDecodeResult =
  SearchURLDecodeResult<ConditionQuery>;

/**
 * Advanced Search条件を共有URLへ載せるため、短い条件は従来Base64、長い条件は圧縮Base64URLを優先する。
 * q/qzどちらを選ぶかの判断はSimple Searchと共通のため `searchURLCodec.ts` に委譲する。
 */
export function encodeConditionForBestURL(
  query: unknown
): Promise<SearchURLParam | null> {
  return encodeJSONToBestURLParam(query);
}

/**
 * URLの `q` パラメータをAdvanced Search条件にデコードする。
 * 既存のURL互換のため、`+` が空白に変換されたケースも補正する。
 */
export function decodeConditionFromURL(encoded: string): ConditionQuery | null {
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
 * qzを優先しqへフォールバックする復元手順はSimple Searchと共通のため `searchURLCodec.ts` に委譲する。
 * qz復元失敗時にUI警告を出すため、条件本体だけでなく復元経路も返す。
 */
export function decodeConditionFromURLParamsWithStatus(params: {
  q?: unknown;
  qz?: unknown;
}): Promise<AdvancedSearchURLDecodeResult> {
  return decodeSearchURLParamsWithStatus(
    params,
    decodeCompressedConditionFromURL,
    decodeConditionFromURL
  );
}

/**
 * q/qzいずれかを含む共有URLがどの経路でも復元できなかった場合だけ、ユーザーへ警告する。
 */
export function shouldWarnAdvancedSearchURLRestoreFailure(
  result: AdvancedSearchURLDecodeResult
): boolean {
  return shouldWarnSearchURLRestoreFailure(result);
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
