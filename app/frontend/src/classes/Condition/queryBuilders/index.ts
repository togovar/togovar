import { CONDITION_TYPE, type ConditionTypeValue } from '../../../definition';
import { buildDatasetQuery } from './dataset';
import { buildSignificanceQuery } from './significance';
import { buildGeneQuery } from './gene';
import { buildLocationQuery } from './location';
import { buildPathogenicityQuery } from './pathogenicity';
import { buildVariantIdQuery } from './variantId';
import { buildDefaultQuery } from './default';
import type { ConditionQuery, Builder, BuildContext } from '../../../types';

const BUILDERS: Partial<Record<ConditionTypeValue, Builder>> = {
  [CONDITION_TYPE.dataset]: buildDatasetQuery,
  [CONDITION_TYPE.significance]: buildSignificanceQuery,
  [CONDITION_TYPE.gene_symbol]: buildGeneQuery,
  [CONDITION_TYPE.genotype]: buildDatasetQuery,
  [CONDITION_TYPE.location]: buildLocationQuery,
  [CONDITION_TYPE.pathogenicity_prediction]: buildPathogenicityQuery,
  [CONDITION_TYPE.variant_id]: buildVariantIdQuery,
};

/** Dispatch to the appropriate builder based on condition type */
export function buildQueryFragment(ctx: BuildContext): ConditionQuery {
  const builder = BUILDERS[ctx.type] ?? buildDefaultQuery;
  return builder(ctx);
}
