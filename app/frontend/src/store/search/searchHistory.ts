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
  if (result.condition !== null) {
    return {
      conditions: {
        ...createDefaultSimpleConditions(master),
        ...result.condition,
      } as SimpleSearchCurrentConditions,
      shouldWarn: false,
      isURLTooLong: false,
    };
  }

  const stashedConditions =
    getObjectFromHistoryState<SimpleSearchCurrentConditions>(
      historyState,
      'simpleSearchConditions'
    );
  if (stashedConditions !== null) {
    return {
      conditions: {
        ...createDefaultSimpleConditions(master),
        ...stashedConditions,
      } as SimpleSearchCurrentConditions,
      shouldWarn: false,
      isURLTooLong: true,
    };
  }

  const conditionIds = new Set(master.map((c) => c.id));

  const conditions: Record<string, unknown> =
    createDefaultSimpleConditions(master);

  for (const [key, value] of Object.entries(urlParams)) {
    if (conditionIds.has(key as MasterConditionId)) {
      conditions[key] = value;
    }
  }

  return {
    conditions: conditions as SimpleSearchCurrentConditions,
    shouldWarn: shouldWarnSimpleSearchURLRestoreFailure(
      result,
      hasLegacyFlatSearchParams(urlParams, conditionIds)
    ),
    isURLTooLong: false,
  };
}

/**
 * q/qz以前のSimple Search共有URLが含まれる場合は、その復元を優先して警告対象から外す。
 */
function hasLegacyFlatSearchParams(
  urlParams: Record<string, unknown>,
  conditionIds: Set<MasterConditionId>
): boolean {
  return Object.keys(urlParams).some((key) =>
    conditionIds.has(key as MasterConditionId)
  );
}
