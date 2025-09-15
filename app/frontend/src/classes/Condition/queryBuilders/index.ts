import type { ConditionQuery, Builder, BuildContext } from '../../../types';
import { CONDITION_TYPE, type ConditionTypeValue } from '../../../definition';
import { buildDatasetQuery } from './dataset';
import { buildPathogenicityQuery } from './pathogenicity';
import { buildLocationQuery } from './location';
import { buildGeneQuery } from './gene';
import { buildVariantIdQuery } from './variantId';
import { buildSignificanceQuery } from './significance';
import { buildDefaultQuery } from './default';

const BUILDERS: Partial<Record<ConditionTypeValue, Builder>> = {
  [CONDITION_TYPE.dataset]: buildDatasetQuery,
  [CONDITION_TYPE.genotype]: buildDatasetQuery,
  [CONDITION_TYPE.pathogenicity_prediction]: buildPathogenicityQuery,
  [CONDITION_TYPE.location]: buildLocationQuery,
  [CONDITION_TYPE.gene_symbol]: buildGeneQuery, // NOTE: value = 'gene'
  [CONDITION_TYPE.variant_id]: buildVariantIdQuery, // NOTE: value = 'id'
  [CONDITION_TYPE.significance]: buildSignificanceQuery,
};

/** Dispatch to the appropriate builder based on condition type */
export function buildQueryFragment(ctx: BuildContext): ConditionQuery {
  const builder = BUILDERS[ctx.type] ?? buildDefaultQuery;
  return builder(ctx);
}
