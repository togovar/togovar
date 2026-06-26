import type { BuildContext, PredictionQueryLocal } from '../../../types';
import type { ConditionItemValueView } from '../ConditionItemValueView';
import type { PredictionValueView } from '../ConditionVariantEffectPredictionSearch/PredictionValueView';

/**
 * condition-item-value-view の shadow DOM から prediction-value-view を取得する。
 * shadow root が未構築の場合は Lit 初期化前のアクセスと判断し、即座にエラーとする。
 */
function getPrediction(el: ConditionItemValueView): PredictionValueView | null {
  if (!el.shadowRoot) {
    throw new Error('variant_effect_prediction: missing shadow root');
  }
  return el.shadowRoot.querySelector('prediction-value-view');
}

/**
 * Variant effect prediction 条件のクエリを組み立てる。
 * スコア範囲・inequalitySigns は prediction-value-view が保持しているため
 * DOM から queryValue を取り出してそのまま返す。
 */
export function buildVariantEffectPredictionQuery(
  ctx: BuildContext<'variant_effect_prediction'>
): PredictionQueryLocal {
  const predictionValueEl = getPrediction(ctx.values[0]);
  if (!predictionValueEl) {
    throw new Error('variant_effect_prediction: missing or invalid value');
  }
  return predictionValueEl.queryValue;
}
