// app/frontend/src/classes/Condition/query-builders/significance.ts
import type {
  ConditionQuery,
  ConditionItemValueViewElement,
  SignificanceQuery,
} from '../../../types/conditionTypes';
import type { BuildContext } from './index';

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
): ConditionItemValueViewElement[] {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll(selector)
  ) as ConditionItemValueViewElement[];
}

function buildSourceCondition(
  key: string, // e.g., 'significance'
  relation: string, // 'eq' | 'ne' | ''
  source: 'mgend' | 'clinvar',
  elements: ConditionItemValueViewElement[]
): SignificanceQuery | null {
  if (elements.length === 0) return null;
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
