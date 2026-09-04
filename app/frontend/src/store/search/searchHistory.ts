import type {
  MasterConditionId,
  MasterConditions,
  SimpleSearchCurrentConditions,
} from '../../types';
import type { ConditionQuery } from '../../types/query';
import {
  decodeConditionFromURLParamsWithStatus,
  shouldWarnAdvancedSearchURLRestoreFailure,
} from './advancedSearchURL';
import { getObjectFromHistoryState } from './searchURLCodec';
import {
  createDefaultSimpleConditions,
  decodeSimpleConditionFromURLParamsWithStatus,
  shouldWarnSimpleSearchURLRestoreFailure,
} from './simpleSearchURL';

export type AdvancedSearchHistoryRestoreResult = {
  condition: ConditionQuery | null;
  shouldWarn: boolean;
  /** URLではなくhistory.stateから復元できた場合はtrue。共有URLは依然として条件を表せていない。 */
  isURLTooLong: boolean;
};

export type SimpleSearchHistoryRestoreResult = {
  conditions: SimpleSearchCurrentConditions;
  shouldWarn: boolean;
  isURLTooLong: boolean;
};

/**
 * popstate時のURL/state解釈をここへ閉じ込め、searchManager.tsを検索開始判断に集中させる。
 * URLへ載せられなかった条件はhistory.stateへ退避しているため、URLで復元できない場合はそちらも読む。
 */
export function getAdvancedConditionFromHistory(
  urlParams: Record<string, unknown>,
  historyState: unknown
): Promise<AdvancedSearchHistoryRestoreResult> {
  return decodeConditionFromURLParamsWithStatus(urlParams).then((result) => {
    const stashedCondition = getObjectFromHistoryState<ConditionQuery>(
      historyState,
      'advancedSearchConditions'
    );
    const condition = result.condition ?? stashedCondition;
    const shouldWarn =
      shouldWarnAdvancedSearchURLRestoreFailure(result) && condition === null;
    return {
      condition,
      shouldWarn,
      isURLTooLong: result.condition === null && stashedCondition !== null,
    };
  });
}

/**
 * URLパラメータからSimple Search条件を復元し、URLにない条件はマスターのデフォルトへ戻す。
 * URLへ載せられなかった条件はhistory.stateへ退避しているため、URLで復元できない場合はそちらも読む。
 */
export async function buildSimpleConditionsFromURL(
  urlParams: Record<string, unknown>,
  master: MasterConditions[],
  historyState?: unknown
): Promise<SimpleSearchHistoryRestoreResult> {
  const result = await decodeSimpleConditionFromURLParamsWithStatus(
    urlParams,
    master
  );
  const conditionIds = new Set(master.map((c) => c.id));
  const legacyFlatConditions = extractLegacyFlatSearchConditions(
    urlParams,
    conditionIds
  );
  const hasLegacyFlatParams = Object.keys(legacyFlatConditions).length > 0;
  const stashedConditions =
    getObjectFromHistoryState<SimpleSearchCurrentConditions>(
      historyState,
      'simpleSearchConditions'
    );
  if (!hasLegacyFlatParams && stashedConditions !== null) {
    return {
      conditions: {
        ...createDefaultSimpleConditions(master),
        ...stashedConditions,
        ...(result.condition ?? {}),
      } as SimpleSearchCurrentConditions,
      shouldWarn: false,
      isURLTooLong: true,
    };
  }

  if (result.condition !== null) {
    return {
      conditions: {
        ...createDefaultSimpleConditions(master),
        ...legacyFlatConditions,
        ...result.condition,
      } as SimpleSearchCurrentConditions,
      shouldWarn: shouldWarnSimpleSearchURLRestoreFailure(
        result,
        hasLegacyFlatParams
      ),
      isURLTooLong: false,
    };
  }

  const conditions: Record<string, unknown> =
    createDefaultSimpleConditions(master);

  Object.assign(conditions, legacyFlatConditions);

  return {
    conditions: conditions as SimpleSearchCurrentConditions,
    shouldWarn: shouldWarnSimpleSearchURLRestoreFailure(
      result,
      hasLegacyFlatParams
    ),
    isURLTooLong: false,
  };
}

/**
 * termとは別に渡された旧フラット形式のSimple Search条件だけを抽出する。
 */
function extractLegacyFlatSearchConditions(
  urlParams: Record<string, unknown>,
  conditionIds: Set<MasterConditionId>
): Partial<SimpleSearchCurrentConditions> {
  const conditions: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(urlParams)) {
    if (key !== 'term' && conditionIds.has(key as MasterConditionId)) {
      conditions[key] = value;
    }
  }

  return conditions as Partial<SimpleSearchCurrentConditions>;
}
