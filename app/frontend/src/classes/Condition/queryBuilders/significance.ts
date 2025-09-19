// app/frontend/src/classes/Condition/query-builders/significance.ts
import type {
  ConditionQuery,
  ConditionItemValueViewEl,
  SignificanceQuery,
  BuildContext,
  Relation,
} from '../../../types';

/** Query selectors scoped within the values container. */
const SEL = {
  mgend:
    ':scope > .mgend-wrapper > .mgend-condition-wrapper > condition-item-value-view',
  clinvar:
    ':scope > .clinvar-wrapper > .clinvar-condition-wrapper > condition-item-value-view',
};

function pickScoped(
  container: HTMLElement | null | undefined,
  selector: string
): ConditionItemValueViewEl[] {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll(selector)
  ) as ConditionItemValueViewEl[];
}

function buildSourceCondition(
  key: string, // e.g., 'significance'
  relation: Relation,
  source: 'mgend' | 'clinvar',
  elements: ConditionItemValueViewEl[]
): SignificanceQuery | null {
  if (elements.length === 0) return null;
  console.log(key, relation, source, elements);
  return {
    [key]: {
      relation,
      source: [source],
      terms: elements.map((e) => e.value),
    },
  };
}

/** Build query for clinical significance (combines MGEND and ClinVar). */
export function buildSignificanceQuery(ctx: BuildContext): ConditionQuery {
  const container = ctx.valuesContainer ?? null;
  const mgendEls = pickScoped(container, SEL.mgend);
  const clinvarEls = pickScoped(container, SEL.clinvar);

  const rel = ctx.relation;
  const relationType = rel === 'ne' ? 'and' : 'or';

  const mgend = buildSourceCondition(ctx.type, rel, 'mgend', mgendEls);
  const clinvar = buildSourceCondition(ctx.type, rel, 'clinvar', clinvarEls);

  const conditions = [mgend, clinvar].filter(Boolean) as SignificanceQuery[];

  if (conditions.length === 0) return {};
  if (conditions.length === 1) return conditions[0];

  return { [relationType]: conditions };
}
