import type {
  ConditionItemValueViewEl,
  SignificanceSource,
  SignificanceTerms,
  SignificanceQuery,
  SignificanceExpression,
  BuildContext,
  Relation,
} from '../../../types';

/** Query selectors scoped within the values container. */
const SEL = {
  mgend:
    ':scope > .mgend-wrapper > .mgend-condition-wrapper > condition-item-value-view',
  clinvar:
    ':scope > .clinvar-wrapper > .clinvar-condition-wrapper > condition-item-value-view',
} as const;

const SIGNIFICANCE_TERMS = new Set<SignificanceTerms>([
  'NC',
  'P',
  'PLP',
  'LP',
  'LPLP',
  'DR',
  'ERA',
  'LRA',
  'URA',
  'CS',
  'A',
  'RF',
  'AF',
  'PR',
  'B',
  'LB',
  'CI',
  'AN',
  'O',
  'US',
  'NP',
]);

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

function isSignificanceTerm(v: unknown): v is SignificanceTerms {
  return (
    typeof v === 'string' && SIGNIFICANCE_TERMS.has(v as SignificanceTerms)
  );
}

function collectTerms(
  elements: ConditionItemValueViewEl[]
): SignificanceTerms[] {
  return elements.map((e) => e.value).filter(isSignificanceTerm);
}

// Per-source builder returns `null` when that source is simply "not selected" (no DOM items).
function buildSourceCondition(
  relation: Relation,
  source: SignificanceSource,
  elements: ConditionItemValueViewEl[]
): SignificanceQuery | null {
  if (elements.length === 0) return null;
  const terms = collectTerms(elements);
  if (terms.length === 0) return null;

  return { significance: { relation, source: [source], terms } };
}

export function buildSignificanceQuery(
  ctx: BuildContext<'significance'>
): SignificanceExpression {
  const container = ctx.valuesContainer;
  const mgendEls = pickScoped(container, SEL.mgend);
  const clinvarEls = pickScoped(container, SEL.clinvar);

  // Build clauses per source (MGEND/ClinVar)
  const mgend = buildSourceCondition(ctx.relation, 'mgend', mgendEls);
  const clinvar = buildSourceCondition(ctx.relation, 'clinvar', clinvarEls);

  // Keep only present clauses (drop `null`) and narrow the array to `SignificanceQuery[]`
  const conditions = [mgend, clinvar].filter(
    (clause): clause is SignificanceQuery => clause !== null
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
