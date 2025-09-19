import type {
  ConditionQuery,
  SelectedConditionValueEl,
  FrequencyCountViewElement,
  BuildContext,
} from '../../../types';

/** Narrowing helper to access a shadow root safely. */
function getFrequencyCount(
  el: SelectedConditionValueEl
): FrequencyCountViewElement | null {
  const shadowRoot = el.shadowRoot as ShadowRoot | undefined;
  return shadowRoot
    ? (shadowRoot.querySelector(
        'frequency-count-value-view'
      ) as FrequencyCountViewElement | null)
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
    .map((fc) => (fc as FrequencyCountViewElement).queryValue);

  if (queries.length <= 1) return queries[0] ?? {};
  return { or: queries };
}
