import type {
  MasterConditionId,
  MasterConditions,
  SimpleSearchCurrentConditions,
} from '../types';
import type { ConditionQuery } from '../types/query';
import {
  decodeConditionFromURLParamsWithStatus,
  shouldWarnAdvancedSearchURLRestoreFailure,
} from './advancedSearchURL';

export type AdvancedSearchHistoryRestoreResult = {
  condition: ConditionQuery | null;
  shouldWarn: boolean;
};

/**
 * popstate時のURL/state解釈をここへ閉じ込め、searchManager.tsを検索開始判断に集中させる。
 */
export function getAdvancedConditionFromHistory(
  urlParams: Record<string, unknown>,
  state: unknown
): Promise<AdvancedSearchHistoryRestoreResult> {
  return decodeConditionFromURLParamsWithStatus(urlParams).then((result) => {
    const condition = result.condition ?? getConditionFromHistoryState(state);
    const shouldWarn = shouldWarnAdvancedSearchURLRestoreFailure(
      result,
      condition
    );
    return { condition, shouldWarn };
  });
}

/**
 * URLパラメータからSimple Search条件を復元し、URLにない条件はマスターのデフォルトへ戻す。
 */
export function buildSimpleConditionsFromURL(
  urlParams: Record<string, unknown>,
  master: MasterConditions[]
): SimpleSearchCurrentConditions {
  const conditionIds = new Set(master.map((c) => c.id));

  const conditions: Record<string, unknown> = {};
  for (const cond of master) {
    switch (cond.type) {
      case 'string':
      case 'boolean':
        conditions[cond.id] = cond.default;
        break;
      case 'array':
        conditions[cond.id] = {};
        break;
    }
  }

  for (const [key, value] of Object.entries(urlParams)) {
    if (conditionIds.has(key as MasterConditionId)) {
      conditions[key] = value;
    }
  }

  return conditions as SimpleSearchCurrentConditions;
}

/**
 * URL長制限超過時にhistory.stateへ退避したAdvanced Search条件だけを安全に取り出す。
 */
function getConditionFromHistoryState(state: unknown): ConditionQuery | null {
  if (state === null || typeof state !== 'object' || Array.isArray(state)) {
    return null;
  }

  const val = (state as Record<string, unknown>).advancedSearchConditions;
  if (val === null || typeof val !== 'object' || Array.isArray(val)) {
    return null;
  }

  // 空オブジェクトは「条件なし」センチネル(undefined)と整合させるため null を返す。
  // decodeConditionFromURL も同様に正規化している。
  if (Object.keys(val as Record<string, unknown>).length === 0) {
    return null;
  }

  return val as ConditionQuery;
}
