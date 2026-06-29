import {
  ADVANCED_CONDITION_TYPE,
  type AdvancedConditionTypeValue,
} from '../../../advancedCondition';
import { buildDatasetQuery } from './dataset';
import { buildSignificanceQuery } from './significance';
import { buildGeneQuery } from './gene';
import { buildLocationQuery } from './location';
import { buildVariantEffectPredictionQuery } from './variantEffectPrediction';
import { buildVariantIdQuery } from './variantId';
import { buildDefaultQuery } from './default';
import type {
  ConditionQuery,
  BuilderMap,
  BuildContext,
  DefaultQueryKey,
} from '../../../types';

// 条件種別ごとの専用ビルダーを宣言的に管理する。
// 新しい条件種別を追加するときはここへ追記するだけで済む。
const BUILDERS: BuilderMap = {
  [ADVANCED_CONDITION_TYPE.dataset]: buildDatasetQuery,
  [ADVANCED_CONDITION_TYPE.clinical_significance]: buildSignificanceQuery,
  [ADVANCED_CONDITION_TYPE.gene_symbol]: buildGeneQuery,
  [ADVANCED_CONDITION_TYPE.genotype]: buildDatasetQuery,
  [ADVANCED_CONDITION_TYPE.location]: buildLocationQuery,
  [ADVANCED_CONDITION_TYPE.deleteriousness_prediction]: buildVariantEffectPredictionQuery,
  [ADVANCED_CONDITION_TYPE.variant_id]: buildVariantIdQuery,
};

/**
 * 条件種別に対応するビルダーへディスパッチし、クエリフラグメントを返す。
 * BUILDERS に登録されていない種別は buildDefaultQuery へフォールバックする。
 */
export function buildQueryFragment<T extends AdvancedConditionTypeValue>(
  ctx: BuildContext<T>
): ConditionQuery {
  const b = BUILDERS[ctx.type] as
    | ((c: BuildContext<T>) => ConditionQuery)
    | undefined;

  return b ? b(ctx) : buildDefaultQuery(ctx as BuildContext<DefaultQueryKey>);
}
