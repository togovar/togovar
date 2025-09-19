import type {
  ConditionQuery,
  ConditionItemValueViewEl,
  GeneQuery,
  BuildContext,
} from '../../../types';

/** Build query for gene IDs (numeric). */
export function buildGeneQuery(ctx: BuildContext): ConditionQuery {
  const geneIds = ctx.values.map((v: ConditionItemValueViewEl) =>
    Number(v.value)
  );

  if (geneIds.length === 0) return {};

  // unique
  const uniqueIds = Array.from(new Set(geneIds));

  return { gene: { relation: ctx.relation, terms: uniqueIds } } as GeneQuery;
}
