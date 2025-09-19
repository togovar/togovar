import type {
  ConditionQuery,
  ConditionItemValueViewEl,
  PredictionValueViewEl,
  BuildContext,
} from '../../../types';

function getPrediction(
  el: ConditionItemValueViewEl
): PredictionValueViewEl | null {
  const sr = el.shadowRoot as ShadowRoot | undefined;
  return sr
    ? (sr.querySelector(
        'prediction-value-view'
      ) as PredictionValueViewEl | null)
    : null;
}

/** Build query for pathogenicity_prediction. */
export function buildPathogenicityQuery(ctx: BuildContext): ConditionQuery {
  const first = ctx.values[0];
  if (!first) return {};
  const pred = getPrediction(first);
  return pred ? pred.queryValue : {};
}
