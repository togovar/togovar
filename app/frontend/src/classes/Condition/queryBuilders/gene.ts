import type { ConditionQuery, BuildContext } from '../../../types';

/** Build query for gene IDs (numeric). */
export function buildGeneQuery(ctx: BuildContext<'gene'>): ConditionQuery {
  const geneIds = ctx.values.map((v) => Number(v.value));
  const uniqueIds = Array.from(new Set(geneIds));

  return { gene: { relation: ctx.relation!, terms: uniqueIds } };
}
