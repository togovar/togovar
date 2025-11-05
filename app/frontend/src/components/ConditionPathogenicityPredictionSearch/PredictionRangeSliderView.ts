import { LitElement, html } from 'lit';
import { customElement, property, query, queryAll } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { range } from 'lit/directives/range.js';
import { createGradientSlider } from './createGradientSlider';
import { capitalizeFirstLetter } from '../../utils/capitalizeFirstLetter';
import { setInequalitySign, toggleInequality } from './setInequalitySign';
import { type PredictionKey } from './PredictionDatasets';
import type {
  Inequality,
  UnassignedOption,
  PredictionChangeDetail,
} from './../../types';
import Styles from '../../../stylesheets/object/component/prediction-range-slider.scss';

const SLIDER_CONFIG = {
  min: 0,
  max: 1,
  step: 0.01,
  numberOfScales: 10,
  sliderWidth: 247.5,
} as const;
const SCALE_INTERVAL =
  (SLIDER_CONFIG.max - SLIDER_CONFIG.min) / SLIDER_CONFIG.numberOfScales;

/** Class to create a PredictionRangeSlider */
@customElement('prediction-range-slider')
export class PredictionRangeSlider extends LitElement {
  static styles = [Styles];

  /** dataset name (= prediction key) */
  @property({ type: String, reflect: true, attribute: 'data-dataset' })
  predictionScoreName: PredictionKey = 'alphamissense';

  @property({ type: Number, reflect: true, attribute: 'data-min-value' })
  minValue: number = SLIDER_CONFIG.min;

  @property({ type: Number, reflect: true, attribute: 'data-max-value' })
  maxValue: number = SLIDER_CONFIG.max;

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
  private _numberInput!: NodeListOf<HTMLInputElement>;
  @queryAll('.range-input  > input[type="range"]')
  private _rangeInput!: NodeListOf<HTMLInputElement>;
  @queryAll('.number-input .inequality-sign')
  private _inequalitySign!: NodeListOf<HTMLButtonElement>;
  @query('.slider .bar') private _range!: HTMLDivElement;

  firstUpdated(): void {
    this._range.style.backgroundImage = createGradientSlider(
      this.activeDataset,
      this._range,
      SLIDER_CONFIG.sliderWidth
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
  }

  private _handleSliderValues(
    e: Event,
    primaryInputs: NodeListOf<HTMLInputElement>,
    secondaryInputs: NodeListOf<HTMLInputElement>
  ) {
    let minValue = parseFloat(primaryInputs[0].value);
    let maxValue = parseFloat(primaryInputs[1].value);

    const target = e.target as HTMLInputElement;

    if (target.className === 'from') {
      secondaryInputs[0].value = String(minValue);
      this._range.style.left = minValue * 100 + '%';

      if (minValue > maxValue) {
        maxValue = parseFloat(primaryInputs[0].value);
        primaryInputs[1].value = String(maxValue);
        secondaryInputs[1].value = String(maxValue);
        this._range.style.right = 100 - maxValue * 100 + '%';
      }
    } else {
      secondaryInputs[1].value = String(maxValue);
      this._range.style.right = 100 - maxValue * 100 + '%';

      if (maxValue < minValue) {
        minValue = parseFloat(primaryInputs[1].value);
        primaryInputs[0].value = String(minValue);
        secondaryInputs[0].value = String(minValue);
        this._range.style.left = minValue * 100 + '%';
      }
    }

    this._range.style.backgroundImage = createGradientSlider(
      this.activeDataset,
      this._range,
      SLIDER_CONFIG.sliderWidth
    );
    [this.minValue, this.maxValue] = [minValue, maxValue];
  }

  private _handleThresholdButton = (e: Event) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const minValue = parseFloat(btn.dataset.minValue!);
    const maxValue = parseFloat(btn.dataset.maxValue!);
    const minInequalitySign = btn.dataset.minInequalitySign as Inequality;
    const maxInequalitySign = btn.dataset.maxInequalitySign as Inequality;

    [this._rangeInput[0].value, this._numberInput[0].value] = [
      String(minValue),
      String(minValue),
    ];
    [this._rangeInput[1].value, this._numberInput[1].value] = [
      String(maxValue),
      String(maxValue),
    ];

    setInequalitySign(this._inequalitySign[0], minInequalitySign);
    setInequalitySign(this._inequalitySign[1], maxInequalitySign);

    this._range.style.left = minValue * 100 + '%';
    this._range.style.right = 100 - maxValue * 100 + '%';
    this._range.style.backgroundImage = createGradientSlider(
      this.activeDataset,
      this._range,
      SLIDER_CONFIG.sliderWidth
    );

    this.minValue = minValue;
    this.maxValue = maxValue;
    this.minInequalitySign = minInequalitySign;
    this.maxInequalitySign = maxInequalitySign;
  };

  private _handleInequalitySign(e: Event) {
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
  private _handleLabelCheckbox(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const name = input.dataset.name as UnassignedOption | undefined;
    if (!name) return;
    const checked = input.checked;

    if (name === 'unassigned') this.includeUnassigned = checked;
    if (name === 'unknown') this.includeUnknown = checked;
  }

  private _switchInequalitySign(sign: Inequality) {
    switch (sign) {
      case 'gte':
        return { newSign: 'gt' as Inequality, newHtml: '&#60;' };
      case 'gt':
        return { newSign: 'gte' as Inequality, newHtml: '&#8804;' };
      case 'lte':
        return { newSign: 'lt' as Inequality, newHtml: '&#60;' };
      case 'lt':
        return { newSign: 'lte' as Inequality, newHtml: '&#8804;' };
    }
  }

  render() {
    const createNumberInput = (
      className: 'from' | 'to',
      title: string,
      value: number
    ) => html`
      <input
        type="number"
        class=${className}
        title=${title}
        .value=${String(value)}
        min=${SLIDER_CONFIG.min}
        max=${SLIDER_CONFIG.max}
        step=${SLIDER_CONFIG.step}
        @input=${(e: Event) =>
          this._handleSliderValues(e, this._numberInput, this._rangeInput)}
      />
    `;

    const createRangeInput = (className: 'from' | 'to', value: number) => html`
      <input
        type="range"
        class=${className}
        .value=${String(value)}
        min=${SLIDER_CONFIG.min}
        max=${SLIDER_CONFIG.max}
        step=${SLIDER_CONFIG.step}
        @input=${(e: Event) =>
          this._handleSliderValues(e, this._rangeInput, this._numberInput)}
      />
    `;

    const createInequalitySignButton = (inequalitySign: Inequality) => html`
      <button
        class="inequality-sign"
        type="button"
        data-inequality-sign=${inequalitySign}
        @click=${(e: Event) => this._handleInequalitySign(e)}
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
            @change=${(e: Event) => this._handleLabelCheckbox(e)}
          />
          <label for=${id}>${capitalizeFirstLetter(list)}</label>
        `;
      })}
    `;

    return html`
      <div class="number-input">
        ${createNumberInput('from', 'Lower limit', SLIDER_CONFIG.min)}
        ${createInequalitySignButton('gte')}
        <span>Prediction score</span>
        ${createInequalitySignButton('lte')}
        ${createNumberInput('to', 'Upper limit', SLIDER_CONFIG.max)}
        ${createLabelCheckboxes()}
      </div>

      <div class="slider">
        <div class="bar"></div>
        <ul class="ruler">
          ${map(
            range(SLIDER_CONFIG.numberOfScales + 1),
            (i) => html`<li
              class="scale"
              style="left: calc(${(i * 100) /
              SLIDER_CONFIG.numberOfScales}% - 0.3rem)"
            >
              ${(SCALE_INTERVAL * i).toFixed(1)}
            </li>`
          )}
        </ul>

        <div class="threshold">
          ${Object.entries(this.activeDataset).map(
            ([key, details], i, arr) => html`
              <div
                class="threshold-line"
                style="height:${(arr.length - i) * 20 +
                10}px; left:${details.min * 100}%;"
              ></div>
              <button
                type="button"
                class="threshold-button"
                data-min-value=${details.min}
                data-max-value=${details.max}
                data-min-inequality-sign=${details.minInequalitySign}
                data-max-inequality-sign=${details.maxInequalitySign}
                style="left:${details.min * 100}%; top:${(arr.length - i) *
                20}px;"
                @click=${this._handleThresholdButton}
              >
                ${key}
              </button>
            `
          )}
        </div>
      </div>

      <div class="range-input">
        ${createRangeInput('from', SLIDER_CONFIG.min)}
        ${createRangeInput('to', SLIDER_CONFIG.max)}
      </div>
    `;
  }
}
