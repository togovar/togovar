import type {
  ConditionQuery,
  SelectedConditionValueEl,
  GeneQuery,
  BuildContext,
} from '../../../types';

/** Build query for gene symbol. */
export function buildGeneQuery(ctx: BuildContext): ConditionQuery {
  const first = ctx.values[0] as SelectedConditionValueEl | undefined;
  if (!first) return {};

  const idNum = Number(first.value);
  const q: GeneQuery = {
    gene: { relation: ctx.relation, terms: [idNum] },
  };
  return q;
}
