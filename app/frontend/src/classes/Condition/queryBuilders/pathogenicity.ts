// app/frontend/src/classes/Condition/query-builders/pathogenicity.ts
import type {
  ConditionQuery,
  ConditionItemValueViewElement,
  PredictionValueViewElement,
  BuildContext,
} from '../../../types';

function getPrediction(
  el: ConditionItemValueViewElement
): PredictionValueViewElement | null {
  const sr = (el as any).shadowRoot as ShadowRoot | undefined;
  return sr
    ? (sr.querySelector(
        'prediction-value-view'
      ) as PredictionValueViewElement | null)
    : null;
}

/** Build query for pathogenicity_prediction. */
export function buildPathogenicityQuery(ctx: BuildContext): ConditionQuery {
  const first = ctx.values[0];
  if (!first) return {};
  const pred = getPrediction(first);
  return pred ? pred.queryValue : {};
}
