import type {
  ConditionQuery,
  ConditionItemValueViewEl,
  FrequencyCountViewEl,
  BuildContext,
} from '../../../types';

/** Narrowing helper to access a shadow root safely. */
function getFrequencyCount(
  el: ConditionItemValueViewEl
): FrequencyCountViewEl | null {
  const shadowRoot = el.shadowRoot as ShadowRoot | undefined;
  return shadowRoot
    ? (shadowRoot.querySelector(
        'frequency-count-value-view'
      ) as FrequencyCountViewEl | null)
    : null;
}

/**
 * Build query for dataset/genotype.
 * Each value hosts a <frequency-count-value-view> in its shadowRoot.
 */
export function buildDatasetQuery(ctx: BuildContext): ConditionQuery {
  const queries = ctx.values
    .map(getFrequencyCount)
    .filter(Boolean)
    .map((fc) => (fc as FrequencyCountViewEl).queryValue);

  if (queries.length <= 1) return queries[0] ?? {};
  return { or: queries };
}
