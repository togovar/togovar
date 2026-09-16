import type { ConditionQuery } from '../../types/query';
import {
  decodeCompressedURLToJSON,
  decodeSearchURLParamsWithStatus,
  encodeJSONToQzParam,
  isPlainObject,
  shouldWarnSearchURLRestoreFailure,
  type SearchURLDecodeResult,
  type SearchURLParam,
} from './searchURLCodec';

export type AdvancedSearchURLDecodeResult =
  SearchURLDecodeResult<ConditionQuery>;

/**
 * Advanced Search条件を共有URLへ載せるため、常に圧縮Base64URL（`qz`）でエンコードする。
 * 圧縮できない場合はnullを返し、呼び出し元がhistory.stateへ退避する。
 */
export function encodeConditionForCompressedURL(
  query: unknown
): Promise<SearchURLParam | null> {
  return encodeJSONToQzParam(query);
}

/**
 * qzの復元手順はSimple Searchと共通のため `searchURLCodec.ts` に委譲する。
 * 復元失敗時にUI警告を出すため、条件本体だけでなく復元経路も返す。
 */
export function decodeConditionFromURLParamsWithStatus(params: {
  qz?: unknown;
}): Promise<AdvancedSearchURLDecodeResult> {
  return decodeSearchURLParamsWithStatus(
    params,
    decodeCompressedConditionFromURL
  );
}

/**
 * qzを含む共有URLが復元できなかった場合だけ、ユーザーへ警告する。
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
 * URL/history.stateから復元したqueryのlocationリーフを、現在のリファレンスゲノムのESインデックスに合わせて正規化する。
 * GRCh38はbuildLocationQuery側（queryBuilders/location.ts）で"MT"を"M"へ変換して保存する仕様のため、
 * それより前に発行された共有URLやhistory.stateに残る古い"MT"表記のままだと、
 * バッジ表示は正しく見えても検索APIへは"MT"のまま送られて0件になってしまう。
 * and/orでネストした条件木を再帰的にたどり、location leafだけを書き換える。
 */
export function normalizeAdvancedSearchCondition(
  query: ConditionQuery | null
): ConditionQuery | null {
  if (query === null) return null;
  return normalizeQueryNode(query) as ConditionQuery;
}

/** queryノード1つを見て、論理グループなら子へ再帰し、location leafならchromosomeを書き換える。 */
function normalizeQueryNode(node: unknown): unknown {
  if (!isPlainObject(node)) return node;

  if (Array.isArray(node.and)) {
    return { ...node, and: node.and.map(normalizeQueryNode) };
  }
  if (Array.isArray(node.or)) {
    return { ...node, or: node.or.map(normalizeQueryNode) };
  }

  const location = node.location;
  if (
    TOGOVAR_FRONTEND_REFERENCE === 'GRCh38' &&
    isPlainObject(location) &&
    location.chromosome === 'MT'
  ) {
    return { ...node, location: { ...location, chromosome: 'M' } };
  }

  return node;
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
