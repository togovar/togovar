import type {
  ConditionItemValueViewEl,
  SignificanceSource,
  SignificanceLeaf,
  SignificanceQuery,
  BuildContext,
  Relation,
} from '../../../types';

import {
  SIGNIFICANCE_TERM_SET,
  type SignificanceTerm,
} from '../../../definition';

/** Query selectors scoped within the values container. */
const SEL = {
  mgend:
    ':scope > .mgend-wrapper > .mgend-condition-wrapper > condition-item-value-view',
  clinvar:
    ':scope > .clinvar-wrapper > .clinvar-condition-wrapper > condition-item-value-view',
} as const;

function pickScoped(
  container: HTMLElement | null | undefined,
  selector: string
): ConditionItemValueViewEl[] {
  if (!container) {
    throw new Error('pickScoped: missing container');
  }
  return Array.from(
    container.querySelectorAll(selector)
  ) as ConditionItemValueViewEl[];
}

function isSignificanceTerm(v: unknown): v is SignificanceTerm {
  return (
    typeof v === 'string' && SIGNIFICANCE_TERM_SET.has(v as SignificanceTerm)
  );
}

function collectTerms(
  elements: ConditionItemValueViewEl[]
): SignificanceTerm[] {
  return elements.map((e) => e.value).filter(isSignificanceTerm);
}

// Per-source builder returns `null` when that source is simply "not selected" (no DOM items).
function buildSourceCondition(
  relation: Relation,
  source: SignificanceSource,
  elements: ConditionItemValueViewEl[]
): SignificanceLeaf | null {
  if (elements.length === 0) return null;
  const terms = collectTerms(elements);
  if (terms.length === 0) return null;

  return { significance: { relation, source: [source], terms } };
}

export function buildSignificanceQuery(
  ctx: BuildContext<'significance'>
): SignificanceQuery {
  const container = ctx.valuesContainer;
  const mgendEls = pickScoped(container, SEL.mgend);
  const clinvarEls = pickScoped(container, SEL.clinvar);

  // Build clauses per source (MGEND/ClinVar)
  const mgend = buildSourceCondition(ctx.relation, 'mgend', mgendEls);
  const clinvar = buildSourceCondition(ctx.relation, 'clinvar', clinvarEls);

  // Keep only present clauses (drop `null`) and narrow the array to `SignificanceLeaf[]`
  const conditions = [mgend, clinvar].filter(
    (clause): clause is SignificanceLeaf => clause !== null
  );

  // 0 sources => user selected nothing in both sections: fail fast
  if (conditions.length === 0) {
    throw new Error('significance: no terms selected');
  }

  // 1 source => pass the single clause through as-is
  if (conditions.length === 1) {
    return conditions[0];
  }

  // 2 sources => combine by relation: 'ne' (exclude) uses AND, otherwise OR
  return ctx.relation === 'ne' ? { and: conditions } : { or: conditions };
}
