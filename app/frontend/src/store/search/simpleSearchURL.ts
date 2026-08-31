import type {
  MasterConditionId,
  MasterConditions,
  SimpleSearchCurrentConditions,
} from '../../types';
import { extractSearchCondition } from './simpleSearchConditions';
import {
  base64ToBytes,
  bytesToBase64,
  decodeCompressedURLToJSON,
  encodeJSONToCompressedURL,
  getFirstString,
  SEARCH_URL_COMPRESSION_MIN_LEGACY_LENGTH,
  isPlainObject,
  type SearchURLParam,
} from './searchURLCodec';

/**
 * Simple Searchの共有URLは短く保ちたいが、日本語検索語も壊さず復元できる必要がある。
 * 差分条件だけをJSON化し、UTF-8バイト列としてBase64へ変換する。
 */
export function encodeSimpleConditionForURL(
  currentConditions: SimpleSearchCurrentConditions,
  masterConditions: MasterConditions[]
): string | null {
  const diffConditions = extractSearchCondition(
    currentConditions,
    masterConditions
  );
  if (Object.keys(diffConditions).length === 0) return null;

  try {
    return bytesToBase64(
      new TextEncoder().encode(JSON.stringify(diffConditions))
    );
  } catch {
    return null;
  }
}

/**
 * Simple Search条件を共有URLへ載せるため、短い条件は従来Base64、長い条件は圧縮Base64URLを優先する。
 */
export async function encodeSimpleConditionForBestURL(
  currentConditions: SimpleSearchCurrentConditions,
  masterConditions: MasterConditions[]
): Promise<SearchURLParam | null> {
  const legacy = encodeSimpleConditionForURL(
    currentConditions,
    masterConditions
  );
  if (
    legacy !== null &&
    legacy.length <= SEARCH_URL_COMPRESSION_MIN_LEGACY_LENGTH
  ) {
    return { name: 'q', value: legacy };
  }

  const compressed = await encodeSimpleConditionForCompressedURL(
    currentConditions,
    masterConditions
  );

  if (legacy === null && compressed === null) return null;
  if (legacy === null) return { name: 'qz', value: compressed! };
  if (compressed === null || legacy.length <= compressed.length) {
    return { name: 'q', value: legacy };
  }
  return { name: 'qz', value: compressed };
}

/**
 * URL長を抑えるため、Compression Streams API対応ブラウザでは差分条件JSONを圧縮する。
 */
async function encodeSimpleConditionForCompressedURL(
  currentConditions: SimpleSearchCurrentConditions,
  masterConditions: MasterConditions[]
): Promise<string | null> {
  const diffConditions = extractSearchCondition(
    currentConditions,
    masterConditions
  );
  if (Object.keys(diffConditions).length === 0) return null;

  return encodeJSONToCompressedURL(diffConditions);
}

/**
 * URLのqは外部共有値なので、マスターに存在するキーだけをSimple Search条件として採用する。
 */
export function decodeSimpleConditionFromURL(
  encoded: unknown,
  masterConditions: MasterConditions[]
): Partial<SimpleSearchCurrentConditions> | null {
  if (typeof encoded !== 'string' || encoded === '') return null;

  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64ToBytes(encoded)));
    if (!isPlainObject(parsed)) return null;

    return pickKnownSimpleConditions(parsed, masterConditions);
  } catch {
    return null;
  }
}

/**
 * Simple SearchのURL条件は圧縮版qzを優先し、既存qと従来フラットURLの互換性を残す。
 */
export async function decodeSimpleConditionFromURLParams(
  params: Record<string, unknown>,
  masterConditions: MasterConditions[]
): Promise<Partial<SimpleSearchCurrentConditions> | null> {
  const compressed = getFirstString(params.qz);
  if (compressed !== undefined) {
    const decoded = await decodeCompressedSimpleConditionFromURL(
      compressed,
      masterConditions
    );
    if (decoded !== null) return decoded;
  }

  return decodeSimpleConditionFromURL(params.q, masterConditions);
}

/**
 * qzは圧縮済みバイト列のBase64URL表現なので、展開後にJSONとして読む。
 */
async function decodeCompressedSimpleConditionFromURL(
  encoded: string,
  masterConditions: MasterConditions[]
): Promise<Partial<SimpleSearchCurrentConditions> | null> {
  const parsed = await decodeCompressedURLToJSON(
    encoded,
    'Decompressed Simple Search URL is too large.'
  );
  if (!isPlainObject(parsed)) return null;

  return pickKnownSimpleConditions(parsed, masterConditions);
}

/**
 * URLに含まれないSimple Search条件は、前の履歴状態を引きずらないようマスターの初期値へ戻す。
 */
export function createDefaultSimpleConditions(
  masterConditions: MasterConditions[]
): SimpleSearchCurrentConditions {
  const conditions: Record<string, unknown> = {};
  for (const condition of masterConditions) {
    switch (condition.type) {
      case 'string':
      case 'boolean':
        conditions[condition.id] = condition.default;
        break;
      case 'array':
        conditions[condition.id] = {};
        break;
    }
  }

  return conditions as SimpleSearchCurrentConditions;
}

/**
 * URL由来のオブジェクトは、現在のSimple Searchマスターにある条件キーだけに絞る。
 */
function pickKnownSimpleConditions(
  parsed: Record<string, unknown>,
  masterConditions: MasterConditions[]
): Partial<SimpleSearchCurrentConditions> {
  const conditionIds = new Set(
    masterConditions.map((condition) => condition.id)
  );
  const conditions: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (conditionIds.has(key as MasterConditionId)) {
      conditions[key] = value;
    }
  }

  return conditions as Partial<SimpleSearchCurrentConditions>;
}
