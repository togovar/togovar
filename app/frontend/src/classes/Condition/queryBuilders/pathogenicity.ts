import type {
  ConditionItemValueViewEl,
  BuildContext,
  PredictionLeaf,
  PredictionValueViewEl,
} from '../../../types';

function getPrediction(
  el: ConditionItemValueViewEl
): PredictionValueViewEl | null {
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
