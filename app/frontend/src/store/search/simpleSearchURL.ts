import type {
  MasterConditionId,
  MasterConditions,
  SimpleSearchCurrentConditions,
} from '../../types';
import { extractSearchCondition } from './simpleSearchConditions';
import {
  decodeCompressedURLToJSON,
  encodeJSONToCompressedParam,
  getFirstString,
  isPlainObject,
  shouldWarnSearchURLRestoreFailure,
  type SearchURLDecodeResult,
} from './searchURLCodec';

export type SimpleSearchURLDecodeResult = SearchURLDecodeResult<
  Partial<SimpleSearchCurrentConditions>
>;

export type SimpleSearchURLEncodeResult = {
  params: Record<string, string>;
  /** URLだけでは復元できない条件がある場合、history.state退避を呼び出し元へ求める。 */
  hasOmittedConditions: boolean;
};

/**
 * termは圧縮せず生文字列のままURLへ載せるため、圧縮後データ用の上限とは別の、
 * 実URLとして壊れない小さめの上限を設ける。
 */
const SIMPLE_SEARCH_TERM_MAX_LENGTH = 500;

/**
 * キーワードは可読な`term`として残し、フィルタ条件だけを圧縮して共有URLを短くする。
 * 圧縮エンコード手順自体はAdvanced Searchと共通のため `searchURLCodec.ts` に委譲する。
 */
export async function encodeSimpleConditionForURLParams(
  currentConditions: SimpleSearchCurrentConditions,
  masterConditions: MasterConditions[]
): Promise<SimpleSearchURLEncodeResult> {
  const diffConditions = extractSearchCondition(
    currentConditions,
    masterConditions
  );
  const params: Record<string, string> = {};
  let hasOmittedConditions = false;
  const term = diffConditions.term;
  if (typeof term === 'string' && term !== '') {
    if (canReflectReadableTerm(term)) {
      params.term = term;
    } else {
      hasOmittedConditions = true;
    }
  }

  const filterConditions = omitTermCondition(diffConditions);
  if (Object.keys(filterConditions).length === 0) {
    return { params, hasOmittedConditions };
  }

  const filter = await encodeJSONToCompressedParam(filterConditions, 'filter');
  if (filter !== null) {
    params[filter.name] = filter.value;
  } else {
    hasOmittedConditions = true;
  }

  return { params, hasOmittedConditions };
}

/**
 * termはURL上で読める値として扱い、filterだけを圧縮条件として復元する。
 * 旧フラットURLは別経路で読むため、ここでは新形式の圧縮フィルタだけを扱う。
 */
export function decodeSimpleConditionFromURLParamsWithStatus(
  params: Record<string, unknown>,
  masterConditions: MasterConditions[]
): Promise<SimpleSearchURLDecodeResult> {
  return decodeSimpleFilterParamsWithStatus(params, masterConditions).then(
    (result) => ({
      ...result,
      condition: mergeTermParam(result.condition, params),
    })
  );
}

/**
 * filterを含む共有URLが復元できず、従来フラットURLでもない場合だけ警告する。
 */
export function shouldWarnSimpleSearchURLRestoreFailure(
  result: SimpleSearchURLDecodeResult,
  hasLegacyFlatParams: boolean
): boolean {
  return shouldWarnSearchURLRestoreFailure(result, hasLegacyFlatParams);
}

/**
 * filterは圧縮済みバイト列のBase64URL表現なので、展開後にJSONとして読む。
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
 * filterの復元状態を同じ形で返し、警告表示の判定を共通化しやすくする。
 */
async function decodeSimpleFilterParamsWithStatus(
  params: Record<string, unknown>,
  masterConditions: MasterConditions[]
): Promise<SimpleSearchURLDecodeResult> {
  const compressed = getFirstString(params.filter);
  const condition =
    compressed !== undefined
      ? await decodeCompressedSimpleConditionFromURL(
          compressed,
          masterConditions
        )
      : null;

  return {
    condition,
    hasCompressedParam: compressed !== undefined,
    restoredFromCompressed: condition !== null,
  };
}

/**
 * termは圧縮せずURLへ出すため、圧縮フィルタの復元結果へ後から合成する。
 */
function mergeTermParam(
  condition: Partial<SimpleSearchCurrentConditions> | null,
  params: Record<string, unknown>
): Partial<SimpleSearchCurrentConditions> | null {
  const term = getFirstString(params.term);
  if (term === undefined) return condition;
  return { ...(condition ?? {}), term };
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

/**
 * termは個別URLパラメータで表すため、圧縮対象のフィルタ条件から除外する。
 */
function omitTermCondition(
  conditions: Record<string, unknown>
): Record<string, unknown> {
  const filterConditions: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(conditions)) {
    if (key !== 'term') {
      filterConditions[key] = value;
    }
  }
  return filterConditions;
}

/**
 * termは圧縮パラメータを通らないため、単独でもURLを壊さない長さに制限する。
 * 不対サロゲートを含む文字列ではencodeURIComponentが例外を投げるため、
 * その場合もURLへ載せられない扱いにする。
 */
function canReflectReadableTerm(term: string): boolean {
  try {
    return encodeURIComponent(term).length <= SIMPLE_SEARCH_TERM_MAX_LENGTH;
  } catch {
    return false;
  }
}
