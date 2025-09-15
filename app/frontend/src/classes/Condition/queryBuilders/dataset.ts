import type {
  ConditionQuery,
  ConditionItemValueViewElement,
  FrequencyCountValueViewElement,
} from '../../../types/conditionTypes';
import type { BuildContext } from './index';

/** Narrowing helper to access a shadow root safely. */
function getFrequencyCount(
  el: ConditionItemValueViewElement
): FrequencyCountValueViewElement | null {
  const shadowRoot = el.shadowRoot as ShadowRoot | undefined;
  return shadowRoot
    ? (shadowRoot.querySelector(
        'frequency-count-value-view'
      ) as FrequencyCountValueViewElement | null)
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
    .map((fc) => (fc as FrequencyCountValueViewElement).queryValue);

  if (queries.length <= 1) return queries[0] ?? {};
  return { or: queries };
}
