import type { GeneLeaf, BuildContext } from '../../../types';

/** Build query for gene IDs (numeric). */
export function buildGeneQuery(ctx: BuildContext<'gene'>): GeneLeaf {
  const geneIds = ctx.values.map((v) => Number(v.value));
  const uniqueIds = Array.from(new Set(geneIds));
  const labels = Object.fromEntries(
    ctx.values.map((v) => [String(v.value), v.label])
  );

  return { gene: { relation: ctx.relation!, terms: uniqueIds, labels } };
}
