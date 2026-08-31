import type {
  MasterConditionId,
  MasterConditions,
  SimpleSearchCurrentConditions,
} from '../../types';
import { extractSearchCondition } from './simpleSearchConditions';
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

export type SimpleSearchURLDecodeResult = SearchURLDecodeResult<
  Partial<SimpleSearchCurrentConditions>
>;

export type SimpleSearchURLEncodeResult = {
  param: SearchURLParam | null;
  /** 差分条件が1つもない（=URLに載せる必要がない）場合はfalse。長さ超過とURL不要を区別するために使う。 */
  hasConditions: boolean;
};

/**
 * Simple Search条件を共有URLへ載せるため、差分条件だけを抽出し、
 * 短い条件は従来Base64、長い条件は圧縮Base64URLを優先する。
 * q/qzどちらを選ぶかの判断はAdvanced Searchと共通のため `searchURLCodec.ts` に委譲する。
 */
export async function encodeSimpleConditionForBestURL(
  currentConditions: SimpleSearchCurrentConditions,
  masterConditions: MasterConditions[]
): Promise<SimpleSearchURLEncodeResult> {
  const diffConditions = extractSearchCondition(
    currentConditions,
    masterConditions
  );
  if (Object.keys(diffConditions).length === 0) {
    return { param: null, hasConditions: false };
  }

  return {
    param: await encodeJSONToBestURLParam(diffConditions),
    hasConditions: true,
  };
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
    const parsed = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(base64ToBytes(encoded))
    );
    // 空オブジェクトは通常のencode経路では発生しないため、Advanced Search同様「復元失敗」扱いにする。
    if (!isPlainObject(parsed) || Object.keys(parsed).length === 0) return null;

    return pickKnownSimpleConditions(parsed, masterConditions);
  } catch {
    return null;
  }
}

/**
 * qzを優先しqへフォールバックする復元手順はAdvanced Searchと共通のため `searchURLCodec.ts` に委譲する。
 * qz復元失敗時にUI警告を出すため、条件本体だけでなく復元経路も返す。
 */
export function decodeSimpleConditionFromURLParamsWithStatus(
  params: Record<string, unknown>,
  masterConditions: MasterConditions[]
): Promise<SimpleSearchURLDecodeResult> {
  return decodeSearchURLParamsWithStatus(
    params,
    (encoded) =>
      decodeCompressedSimpleConditionFromURL(encoded, masterConditions),
    (encoded) => decodeSimpleConditionFromURL(encoded, masterConditions)
  );
}

/**
 * q/qzいずれかを含む共有URLがどちらでも復元できず、従来フラットURLでもない場合だけ警告する。
 */
export function shouldWarnSimpleSearchURLRestoreFailure(
  result: SimpleSearchURLDecodeResult,
  hasLegacyFlatParams: boolean
): boolean {
  return shouldWarnSearchURLRestoreFailure(result, hasLegacyFlatParams);
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
  if (!isPlainObject(parsed) || Object.keys(parsed).length === 0) return null;

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
