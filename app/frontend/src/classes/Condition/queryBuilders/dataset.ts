import type {
  FrequencyQuery,
  ConditionItemValueViewEl,
  FrequencyCountViewEl,
  BuildContext,
} from '../../../types';

/** Narrowing helper to access a shadow root safely. */
function getFrequencyCount(
  el: ConditionItemValueViewEl
): FrequencyCountViewEl | null {
  if (!el.shadowRoot) {
    throw new Error('dataset/genotype: missing shadow root');
  }
  return el.shadowRoot.querySelector('frequency-count-value-view');
}

/**
 * Build query for dataset/genotype.
 */
export function buildDatasetQuery(
  ctx: BuildContext<'dataset' | 'genotype'>
): FrequencyQuery {
  const queries = ctx.values
    .map(getFrequencyCount)
    .filter(Boolean)
    .map((fc) => (fc as FrequencyCountViewEl).queryValue);

  if (queries.length <= 1) return queries[0];
  return { or: queries };
}
