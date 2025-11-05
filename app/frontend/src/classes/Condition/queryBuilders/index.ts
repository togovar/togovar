import { CONDITION_TYPE, type ConditionTypeValue } from '../../../definition';
import { buildDatasetQuery } from './dataset';
import { buildSignificanceQuery } from './significance';
import { buildGeneQuery } from './gene';
import { buildLocationQuery } from './location';
import { buildPathogenicityQuery } from './pathogenicity';
import { buildVariantIdQuery } from './variantId';
import { buildDefaultQuery } from './default';
import type {
  ConditionQuery,
  BuilderMap,
  BuildContext,
  DefaultQueryKey,
} from '../../../types';

const BUILDERS: BuilderMap = {
  [CONDITION_TYPE.dataset]: buildDatasetQuery,
  [CONDITION_TYPE.significance]: buildSignificanceQuery,
  [CONDITION_TYPE.gene_symbol]: buildGeneQuery,
  [CONDITION_TYPE.genotype]: buildDatasetQuery,
  [CONDITION_TYPE.location]: buildLocationQuery,
  [CONDITION_TYPE.pathogenicity_prediction]: buildPathogenicityQuery,
  [CONDITION_TYPE.variant_id]: buildVariantIdQuery,
};

/** Dispatch to the appropriate builder based on condition type */
export function buildQueryFragment<T extends ConditionTypeValue>(
  ctx: BuildContext<T>
): ConditionQuery {
  const b = BUILDERS[ctx.type] as
    | ((c: BuildContext<T>) => ConditionQuery)
    | undefined;

  return b ? b(ctx) : buildDefaultQuery(ctx as BuildContext<DefaultQueryKey>);
}
