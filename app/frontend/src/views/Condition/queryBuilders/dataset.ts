import type { FrequencyQuery, BuildContext } from '../../../types';
import type { ConditionItemValueView } from '../../../components/ConditionItemValueView';
import type { FrequencyCountValueView } from '../../../components/FrequencyCountValueView';

/**
 * condition-item-value-view の shadow DOM から頻度フィルタ要素を取得する。
 * shadow root が未構築の場合は Lit 初期化前のアクセスと判断し、即座にエラーとして検知する。
 */
function getFrequencyCount(
  el: ConditionItemValueView
): FrequencyCountValueView | null {
  if (!el.shadowRoot) {
    throw new Error('dataset/genotype: missing shadow root');
  }
  return el.shadowRoot.querySelector('frequency-count-value-view');
}

/**
 * dataset / genotype 条件のクエリを組み立てる。
 * 複数データセットは OR で結合する（いずれかの集団に当てはまる変異を返すため）。
 */
export function buildDatasetQuery(
  ctx: BuildContext<'dataset' | 'genotype'>
): FrequencyQuery {
  const queries = ctx.values
    .map(getFrequencyCount)
    .filter(Boolean)
    .map((fc) => (fc as FrequencyCountValueView).queryValue);

  // 0件は空クエリ、1件はそのまま、2件以上は OR で結合する。
  if (queries.length === 0) return {} as FrequencyQuery;
  if (queries.length === 1) return queries[0];
  return { or: queries };
}
