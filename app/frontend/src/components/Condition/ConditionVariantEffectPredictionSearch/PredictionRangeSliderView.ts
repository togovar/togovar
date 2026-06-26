import { LitElement, html } from 'lit';
import { customElement, property, query, queryAll } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { range } from 'lit/directives/range.js';
import { createGradientSlider } from './createGradientSlider';
import { capitalizeFirstLetter } from '../../../utils/capitalizeFirstLetter';
import { setInequalitySign, toggleInequality } from './setInequalitySign';
import { type PredictionKey } from './PredictionDatasets';
import type {
  Inequality,
  UnassignedOption,
  PredictionChangeDetail,
} from '../../../types';
import Styles from '../../../../stylesheets/web-components/prediction-range-slider.scss';

const SLIDER_WIDTH = 247.5;

/** Class to create a PredictionRangeSlider */
@customElement('prediction-range-slider')
export class PredictionRangeSlider extends LitElement {
  static styles = [Styles];

  /** dataset name (= prediction key) */
  @property({ type: String, reflect: true, attribute: 'data-dataset' })
  predictionScoreName: PredictionKey = 'cadd_phred';

  @property({ type: Number, reflect: true, attribute: 'data-min-value' })
  minValue: number = 0;

  @property({ type: Number, reflect: true, attribute: 'data-max-value' })
  maxValue: number = 1;

  @property({ type: Number }) scoreMin = 0;
  @property({ type: Number }) scoreMax = 1;
  @property({ type: Number }) scoreStep = 0.01;
  @property({ type: Number }) numberOfScales = 10;
  @property({ type: String }) scoreLabel = 'Prediction score';
  @property({ type: Boolean }) showThreshold = true;

  @property({
    type: String,
    reflect: true,
    attribute: 'data-min-inequality-sign',
  })
  minInequalitySign: Inequality = 'gte';

  @property({
    type: String,
    reflect: true,
    attribute: 'data-max-inequality-sign',
  })
  maxInequalitySign: Inequality = 'lte';

  // Candidates for “Unassigned/Unknown” (for UI generation)
  @property({ type: Array }) unassignedLists: ReadonlyArray<UnassignedOption> =
    [];

  // Selected state (Unified to boolean instead of array)
  @property({ type: Boolean }) includeUnassigned = false;
  @property({ type: Boolean }) includeUnknown = false; // polyphen 用

  // Threshold data (used for gradient generation)
  @property({ type: Object }) activeDataset: Record<
    string,
    {
      color: string;
      min: number;
      max: number;
      minInequalitySign: Inequality;
      maxInequalitySign: Inequality;
    }
  > = {};

  @queryAll('.number-input > input[type="number"]')
  private numberInput!: NodeListOf<HTMLInputElement>;
  @queryAll('.range-input  > input[type="range"]')
  private rangeInput!: NodeListOf<HTMLInputElement>;
  @queryAll('.number-input .inequality-sign')
  private inequalitySign!: NodeListOf<HTMLButtonElement>;
  @query('.slider .bar') private bar!: HTMLDivElement;

  firstUpdated(): void {
    this.bar.style.backgroundImage = createGradientSlider(
      this.activeDataset,
      this.bar,
      SLIDER_WIDTH,
      this.scoreMin,
      this.scoreMax
    );
  }

  // Notify parent when value changes (array unassignedChecks is deprecated)
  protected updated(changed: Map<string | number | symbol, unknown>): void {
    if (
      changed.has('minValue') ||
      changed.has('maxValue') ||
      changed.has('minInequalitySign') ||
      changed.has('maxInequalitySign') ||
      changed.has('includeUnassigned') ||
      changed.has('includeUnknown')
    ) {
      const detail: PredictionChangeDetail = {
        dataset: this.predictionScoreName,
        values: [Number(this.minValue), Number(this.maxValue)],
        inequalitySigns: [this.minInequalitySign, this.maxInequalitySign],
        includeUnassigned: this.includeUnassigned,
        includeUnknown: this.includeUnknown,
      };
      this.dispatchEvent(
        new CustomEvent<PredictionChangeDetail>('set-prediction-values', {
          detail,
          bubbles: true,
          composed: true,
        })
      );
    }

    // restoreTab など外部からのプロパティ変更時にも不等号ボタンを正しく反映するため
    if (
      (changed.has('minInequalitySign') || changed.has('maxInequalitySign')) &&
      this.inequalitySign?.length >= 2
    ) {
      setInequalitySign(this.inequalitySign[0], this.minInequalitySign);
      setInequalitySign(this.inequalitySign[1], this.maxInequalitySign);
    }

    // restoreTab など外部からのプロパティ変更時にもバー位置を正しく反映するため
    if ((changed.has('minValue') || changed.has('maxValue')) && this.bar) {
      this.bar.style.left = this.valueToPercent(this.minValue) + '%';
      this.bar.style.right = 100 - this.valueToPercent(this.maxValue) + '%';
      this.bar.style.backgroundImage = createGradientSlider(
        this.activeDataset,
        this.bar,
        SLIDER_WIDTH,
        this.scoreMin,
        this.scoreMax
      );
    }
  }

  /**
   * number input からフォーカスが外れたとき、空欄または範囲外なら有効な境界値に補完してスライダーと同期する。
   * 入力途中の暫定値を許容しつつ、最終的に NaN や範囲外の値がバー位置やクエリに残らないようにするため。
   */
  private handleNumberInputBlur = (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const value = parseFloat(input.value);
    const isFrom = input.className === 'from';

    let corrected: number | null = null;
    if (isNaN(value)) {
      corrected = isFrom ? this.scoreMin : this.scoreMax;
    } else if (value < this.scoreMin) {
      corrected = this.scoreMin;
    } else if (value > this.scoreMax) {
      corrected = this.scoreMax;
    }

    if (corrected === null) return;
    input.value = String(corrected);
    input.dispatchEvent(new Event('input'));
  };

  private handleSliderValues(
    e: Event,
    primaryInputs: NodeListOf<HTMLInputElement>,
    secondaryInputs: NodeListOf<HTMLInputElement>
  ) {
    let minValue = parseFloat(primaryInputs[0].value);
    let maxValue = parseFloat(primaryInputs[1].value);

    const target = e.target as HTMLInputElement;

    // 編集中フィールドが空欄の場合は blur 時に補完するため、ここでは更新しない
    if (target.className === 'from' && isNaN(minValue)) return;
    if (target.className !== 'from' && isNaN(maxValue)) return;

    if (target.className === 'from') {
      secondaryInputs[0].value = String(minValue);
      this.bar.style.left = this.valueToPercent(minValue) + '%';

      if (minValue > maxValue) {
        maxValue = parseFloat(primaryInputs[0].value);
        primaryInputs[1].value = String(maxValue);
        secondaryInputs[1].value = String(maxValue);
        this.bar.style.right = 100 - this.valueToPercent(maxValue) + '%';
      }
    } else {
      secondaryInputs[1].value = String(maxValue);
      this.bar.style.right = 100 - this.valueToPercent(maxValue) + '%';

      if (maxValue < minValue) {
        minValue = parseFloat(primaryInputs[1].value);
        primaryInputs[0].value = String(minValue);
        secondaryInputs[0].value = String(minValue);
        this.bar.style.left = this.valueToPercent(minValue) + '%';
      }
    }

    this.bar.style.backgroundImage = createGradientSlider(
      this.activeDataset,
      this.bar,
      SLIDER_WIDTH,
      this.scoreMin,
      this.scoreMax
    );
    [this.minValue, this.maxValue] = [minValue, maxValue];
  }

  private handleThresholdButton = (e: Event) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const minValue = parseFloat(btn.dataset.minValue!);
    const maxValue = parseFloat(btn.dataset.maxValue!);
    const minInequalitySign = btn.dataset.minInequalitySign as Inequality;
    const maxInequalitySign = btn.dataset.maxInequalitySign as Inequality;

    [this.rangeInput[0].value, this.numberInput[0].value] = [
      String(minValue),
      String(minValue),
    ];
    [this.rangeInput[1].value, this.numberInput[1].value] = [
      String(maxValue),
      String(maxValue),
    ];

    setInequalitySign(this.inequalitySign[0], minInequalitySign);
    setInequalitySign(this.inequalitySign[1], maxInequalitySign);

    this.bar.style.left = this.valueToPercent(minValue) + '%';
    this.bar.style.right = 100 - this.valueToPercent(maxValue) + '%';
    this.bar.style.backgroundImage = createGradientSlider(
      this.activeDataset,
      this.bar,
      SLIDER_WIDTH,
      this.scoreMin,
      this.scoreMax
    );

    this.minValue = minValue;
    this.maxValue = maxValue;
    this.minInequalitySign = minInequalitySign;
    this.maxInequalitySign = maxInequalitySign;
  };

  private handleInequalitySign(e: Event) {
    const btn = e.currentTarget as HTMLButtonElement;
    const prev = btn.dataset.inequalitySign as Inequality;
    const next = toggleInequality(prev);
    setInequalitySign(btn, next);

    if (next === 'gte' || next === 'gt') {
      this.minInequalitySign = next;
    } else {
      this.maxInequalitySign = next;
    }
  }

  // Checkbox → Reflected as boolean
  private handleLabelCheckbox(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const name = input.dataset.name as UnassignedOption | undefined;
    if (!name) return;
    const checked = input.checked;

    if (name === 'unassigned') this.includeUnassigned = checked;
    if (name === 'unknown') this.includeUnknown = checked;
  }

  render() {
    const createNumberInput = (
      className: 'from' | 'to',
      title: string,
      value: number
    ) => html`
      <input
        type="number"
        name=${`${this.predictionScoreName}-${className}`}
        class=${className}
        title=${title}
        .value=${String(value)}
        min=${this.scoreMin}
        max=${this.scoreMax}
        step=${this.scoreStep}
        @input=${(e: Event) =>
          this.handleSliderValues(e, this.numberInput, this.rangeInput)}
        @blur=${this.handleNumberInputBlur}
      />
    `;

    const createRangeInput = (className: 'from' | 'to', value: number) => html`
      <input
        type="range"
        name=${`${this.predictionScoreName}-${className}-range`}
        class=${className}
        .value=${String(value)}
        min=${this.scoreMin}
        max=${this.scoreMax}
        step=${this.scoreStep}
        @input=${(e: Event) =>
          this.handleSliderValues(e, this.rangeInput, this.numberInput)}
      />
    `;

    const createInequalitySignButton = (inequalitySign: Inequality) => html`
      <button
        class="inequality-sign"
        type="button"
        data-inequality-sign=${inequalitySign}
        @click=${(e: Event) => this.handleInequalitySign(e)}
      >
        &#8804;
      </button>
    `;

    const createLabelCheckboxes = () => html`
      ${this.unassignedLists.map((list) => {
        const id = `${this.predictionScoreName}${capitalizeFirstLetter(list)}`;
        const checked =
          list === 'unassigned' ? this.includeUnassigned : this.includeUnknown;
        return html`
          <input
            type="checkbox"
            id=${id}
            data-name=${list}
            .checked=${checked}
            @change=${(e: Event) => this.handleLabelCheckbox(e)}
          />
          <label for=${id}>${capitalizeFirstLetter(list)}</label>
        `;
      })}
    `;

    return html`
      <div class="number-input">
        ${createNumberInput('from', 'Lower limit', this.minValue)}
        ${createInequalitySignButton('gte')}
        <span>${this.scoreLabel}</span>
        ${createInequalitySignButton('lte')}
        ${createNumberInput('to', 'Upper limit', this.maxValue)}
        ${createLabelCheckboxes()}
      </div>

      <div class="slider">
        <div class="bar"></div>
        <ul class="ruler">
          ${map(
            range(this.numberOfScales + 1),
            (i) =>
              html`<li
                class="scale"
                style="left: calc(${(i * 100) / this.numberOfScales}% - 0.3rem)"
              >
                ${this.formatScaleValue(i)}
              </li>`
          )}
        </ul>

        <div class="threshold">
          ${this.showThreshold
            ? Object.entries(this.activeDataset).map(
                ([key, details], i, arr) => html`
                  <div
                    class="threshold-line"
                    style="height:${(arr.length - i) * 20 +
                    10}px; left:${this.valueToPercent(details.min)}%;"
                  ></div>
                  <button
                    type="button"
                    class="threshold-button"
                    data-min-value=${details.min}
                    data-max-value=${details.max}
                    data-min-inequality-sign=${details.minInequalitySign}
                    data-max-inequality-sign=${details.maxInequalitySign}
                    style="left:${this.valueToPercent(
                      details.min
                    )}%; top:${(arr.length - i) * 20}px;"
                    @click=${this.handleThresholdButton}
                  >
                    ${key}
                  </button>
                `
              )
            : ''}
        </div>
      </div>

      <div class="range-input">
        ${createRangeInput('from', this.minValue)}
        ${createRangeInput('to', this.maxValue)}
      </div>
    `;
  }

  /**
   * CADD PHRED のように0-1以外のスコアでもバー位置を正しく出すため、値を%へ正規化する。
   * 範囲外の値もクランプすることでバーがスライダー外にはみ出ないようにするため。
   */
  private valueToPercent(value: number): number {
    const width = this.scoreMax - this.scoreMin;
    if (width <= 0) return 0;
    const clamped = Math.max(this.scoreMin, Math.min(this.scoreMax, value));
    return ((clamped - this.scoreMin) / width) * 100;
  }

  /**
   * スコア範囲ごとの目盛り値を生成する。小数スコアとPHREDスコアの両方を読みやすく表示するため。
   * CADD (scoreMax > 1) は最後の目盛りのみ上限値をそのまま使い、それ以外は自然刻みで四捨五入して整数表示する。
   * 例: 0–99 を 10 分割した場合、9.9 刻みを 10 単位に丸めて 0, 10, 20, …, 90, 99 と表示する。
   */
  private formatScaleValue(index: number): string {
    const value =
      this.scoreMin +
      ((this.scoreMax - this.scoreMin) / this.numberOfScales) * index;
    if (this.scoreMax > 1) {
      if (index === this.numberOfScales) return String(this.scoreMax);
      const step = Math.max(
        1,
        Math.round((this.scoreMax - this.scoreMin) / this.numberOfScales)
      );
      return String(Math.round(value / step) * step);
    }
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
}
