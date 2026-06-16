import type {
  MasterConditionId,
  MasterConditions,
  SimpleSearchCurrentConditions,
} from '../types';
import type { ConditionQuery } from '../types/query';
import { decodeConditionFromURL } from './advancedSearchURL';

/**
 * popstate時のURL/state解釈をここへ閉じ込め、searchManager.tsを検索開始判断に集中させる。
 */
export function getAdvancedConditionFromHistory(
  urlParams: Record<string, unknown>,
  state: unknown
): ConditionQuery | null {
  const qParam = urlParams.q;
  const first = Array.isArray(qParam) ? qParam[0] : qParam;
  const encoded = typeof first === 'string' ? first : undefined;

  return encoded
    ? decodeConditionFromURL(encoded)
    : getConditionFromHistoryState(state);
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

  return val as ConditionQuery;
}
