import type { FrequencyQuery, BuildContext } from '../../../types';
import type { ConditionItemValueView } from '../../../components/ConditionItemValueView';
import type { FrequencyCountValueView } from '../../../components/FrequencyCountValueView';

/** Narrowing helper to access a shadow root safely. */
function getFrequencyCount(
  el: ConditionItemValueView
): FrequencyCountValueView | null {
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
    .map((fc) => (fc as FrequencyCountValueView).queryValue);

  if (queries.length === 0) return {} as FrequencyQuery;
  if (queries.length === 1) return queries[0];
  return { or: queries };
}
