import {
  LitElement,
  html,
  type TemplateResult,
  type CSSResultGroup,
} from 'lit';
import { customElement } from 'lit/decorators.js';
import type { Frequency } from '../types/api';
import Styles from '../../stylesheets/object/component/frequency-block-view.scss';

/** CSSが表示するブロック数を決定するためのカテゴリラベル */
type LogFrequencyLabel =
  | 'na' // データなし
  | 'monomorphic' // 頻度0（モノモルフィック）
  | '<0.0001' // ブロック1個
  | '<0.001' // ブロック2個
  | '<0.01' // ブロック3個
  | '<0.05' // ブロック4個
  | '<0.5' // ブロック5個
  | '≥0.5'; // ブロック6個（最大）

/**
 * アレル頻度（af）を対数スケールのカテゴリラベルに変換する。
 * このラベルは `data-frequency` 属性にセットされ、
 * SCSSのセレクタが何個のブロックを表示するかを制御する。
 */
const getLogFrequencyLabel = (
  frequency?: Frequency
): LogFrequencyLabel => {
  if (!frequency) return 'na';

  const { af: alleleFrequency } = frequency;

  // afがundefinedの場合はモノモルフィック扱い
  if (alleleFrequency === undefined) return 'monomorphic';

  if (alleleFrequency >= 0.5) return '≥0.5';
  if (alleleFrequency > 0.05) return '<0.5';
  if (alleleFrequency > 0.01) return '<0.05';
  if (alleleFrequency > 0.001) return '<0.01';
  if (alleleFrequency > 0.0001) return '<0.001';
  if (alleleFrequency > 0) return '<0.0001';
  return 'monomorphic';
};

@customElement('frequency-block-view')
export class FrequencyBlockView extends LitElement {
  static styles: CSSResultGroup = [Styles];

  /** アレルカウント（ac） */
  alleleCount?: number;
  /** 総アレル数（an） */
  total?: number;
  /** アレル頻度（af） */
  frequencyValue?: number;
  /** Alt/Alt ホモ接合体数（aac）: ホモ接合マーカーの表示に使用 */
  homozygousAlleleCount?: number;
  /** Alt ヘミ接合体数（hac）: ヘミ接合マーカーの表示に使用 */
  hemizygoteAlleleCount?: number;

  private _frequency?: Frequency;

  render(): TemplateResult {
    return html`
      <span class="marker homozygote-marker"></span>
      <span class="marker hemizygote-marker"></span>
    `;
  }

  get frequency(): Frequency | undefined {
    return this._frequency;
  }

  /**
   * 頻度データを `data-*` 属性に反映する。
   * SCSSは属性値を見て、表示するブロック数やマーカーを切り替える。
   */
  set frequency(frequency: Frequency | undefined) {
    this._frequency = frequency;
    this.alleleCount = frequency?.ac;
    this.total = frequency?.an;
    this.frequencyValue = frequency?.af;
    this.homozygousAlleleCount = frequency?.aac;
    this.hemizygoteAlleleCount = frequency?.hac;

    this._setDatasetValue('alleleCount', this.alleleCount);

    // ホモ接合マーカーは aac が 1 以上のときだけ表示する
    this._setDatasetValue(
      'homozygousAlleleCount',
      this.homozygousAlleleCount && this.homozygousAlleleCount >= 1
        ? this.homozygousAlleleCount
        : undefined
    );
    // ヘミ接合マーカーは hac が 1 以上のときだけ表示する
    this._setDatasetValue(
      'hemizygoteAlleleCount',
      this.hemizygoteAlleleCount && this.hemizygoteAlleleCount >= 1
        ? this.hemizygoteAlleleCount
        : undefined
    );
    this._setDatasetValue('frequency', getLogFrequencyLabel(frequency));
  }

  /**
   * `HTMLElement.dataset` は文字列のみ保持するため、
   * 値がない場合は属性自体を削除して古い状態が残らないようにする。
   */
  private _setDatasetValue(
    key: string,
    value: string | number | undefined
  ): void {
    if (value === undefined || value === null || value === '') {
      delete this.dataset[key];
      return;
    }

    this.dataset[key] = String(value);
  }
}
