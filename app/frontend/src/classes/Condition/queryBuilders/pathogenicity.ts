import type { BuildContext, PredictionLeaf } from '../../../types';
import type { ConditionItemValueView } from '../../../components/ConditionItemValueView';
import type { PredictionValueView } from '../../../components/ConditionPathogenicityPredictionSearch/PredictionValueView';

function getPrediction(el: ConditionItemValueView): PredictionValueView | null {
  if (!el.shadowRoot) {
    throw new Error('pathogenicity_prediction: missing shadow root');
  }
  return el.shadowRoot.querySelector('prediction-value-view');
}

/** Build query for pathogenicity_prediction. */
export function buildPathogenicityQuery(
  ctx: BuildContext<'pathogenicity_prediction'>
): PredictionLeaf {
  const predictionValueEl = getPrediction(ctx.values[0]);
  if (!predictionValueEl) {
    throw new Error('pathogenicity_prediction: missing or invalid value');
  }
  return predictionValueEl.queryValue;
}
