import { ADVANCED_CONDITIONS } from '../../global';
import type { ConditionTypeValue } from '../../definition';
import type { RestoredConditionValue } from '../../types';
import type { Relation } from '../../types';

/** URL由来のunknownを安全に扱うための型エイリアス。 */
export type QueryObject = Record<string, unknown>;

/**
 * 各restorer関数が共通で返す復元済み条件の型。
 * relation は eq/ne を持つ条件だけがセットする。
 */
export type RestoredItem = Readonly<{
  conditionType: ConditionTypeValue;
  relation?: Relation;
  values: RestoredConditionValue[];
}>;

/** URL由来の unknownを安全に扱うため、配列ではないプレーンなobjectだけに絞る。 */
export function isQueryObject(value: unknown): value is QueryObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** ラベルが見つからない条件でもUI表示できるよう、value をlabelの代替にする。 */
export function makeValue(
  value: string,
  label: string = value
): RestoredConditionValue {
  return { value, label };
}

/**
 * gt/gteの違いは現状の表示UIでは区別しないため、開始値としてまとめて扱う。
 * gte/gt のどちらが来てもUIのfromフィールドへ入れる。
 */
export function getRangeStart(range: QueryObject): number | null {
  return getNumber(range.gte ?? range.gt);
}

/**
 * lt/lteの違いは現状の表示UIでは区別しないため、終了値としてまとめて扱う。
 * lte/lt のどちらが来てもUIのtoフィールドへ入れる。
 */
export function getRangeEnd(range: QueryObject): number | null {
  return getNumber(range.lte ?? range.lt);
}

/** URL由来の値は信用せず、有限なnumberだけをrange値として採用する。 */
export function getNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function getString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * 検索条件マスタから表示ラベルを探す。
 * URL復元後に生のIDをそのまま表示しないよう、通常操作時と近い見た目へ戻す。
 */
export function findConditionLabel(
  conditionType: ConditionTypeValue,
  value: string
): string {
  const condition = ADVANCED_CONDITIONS[conditionType];
  if (!condition || typeof condition !== 'object' || !('values' in condition)) {
    return value;
  }

  return findLabelInValues(condition.values, value) ?? value;
}

/**
 * datasetのような階層値と、significanceのようなsource別値の両方を再帰的に探す。
 * 値の形状がconditionTypeごとに異なるため、配列とオブジェクトの両パターンに対応する。
 */
export function findLabelInValues(
  values: unknown,
  targetValue: string
): string | null {
  if (Array.isArray(values)) {
    for (const item of values) {
      const label = _findLabelInValueItem(item, targetValue);
      if (label) return label;
    }
    return null;
  }

  if (isQueryObject(values)) {
    for (const value of Object.values(values)) {
      const label = findLabelInValues(value, targetValue);
      if (label) return label;
    }
  }

  return null;
}

/** 1つのマスタ項目を調べ、子要素があればさらに下へ潜る。 */
function _findLabelInValueItem(
  item: unknown,
  targetValue: string
): string | null {
  if (!isQueryObject(item)) return null;

  if (item.value === targetValue && typeof item.label === 'string') {
    return item.label;
  }

  return findLabelInValues(item.children, targetValue);
}
