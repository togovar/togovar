import { LitElement, html } from 'lit';
import { customElement, property, query, queryAll } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { range } from 'lit/directives/range.js';
import { createGradientSlider } from './createGradientSlider';
import { capitalizeFirstLetter } from '../../utils/capitalizeFirstLetter';
import { setInequalitySign } from './setInequalitySign.js';
import Styles from '../../../stylesheets/object/component/prediction-range-slider.scss';

const SLIDER_CONFIG = {
  min: 0,
  max: 1,
  step: 0.01,
  numberOfScales: 10,
  sliderWidth: 247.5,
};
SLIDER_CONFIG.scaleInterval =
  (SLIDER_CONFIG.max - SLIDER_CONFIG.min) / SLIDER_CONFIG.numberOfScales;

/** Class to create a PredictionRangeSlider */
@customElement('prediction-range-slider')
export class PredictionRangeSlider extends LitElement {
  static styles = [Styles];

  @property({ type: String, reflect: true, attribute: 'data-dataset' })
  predictionScoreName;
  @property({ type: Number, reflect: true, attribute: 'data-min-value' })
  minValue;
  @property({ type: Number, reflect: true, attribute: 'data-max-value' })
  maxValue;
  @property({
    type: String,
    reflect: true,
    attribute: 'data-min-inequality-sign',
  })
  minInequalitySign;
  @property({
    type: String,
    reflect: true,
    attribute: 'data-max-inequality-sign',
  })
  maxInequalitySign;
  @property({ type: Array }) unassignedChecks;
  @property({ type: Object }) activeDataset;
  @property({ type: Object }) unassignedLists;

  @queryAll('.number-input > input[type="number"]') _numberInput;
  @queryAll('.range-input > input[type="range"]') _rangeInput;
  @queryAll('.number-input .inequality-sign') _inequalitySign;
  @query('.slider .bar') _range;

  firstUpdated() {
    this._range.style.backgroundImage = createGradientSlider(
      this.activeDataset,
      this._range,
      SLIDER_CONFIG.sliderWidth
    );
  }

  updated(changedProperties) {
    if (
      changedProperties.has('minValue') ||
      changedProperties.has('maxValue') ||
      changedProperties.has('minInequalitySign') ||
      changedProperties.has('maxInequalitySign') ||
      changedProperties.has('unassignedChecks')
    ) {
      this.dispatchEvent(
        new CustomEvent('set-prediction-values', {
          detail: {
            values: [this.minValue, this.maxValue],
            inequalitySigns: [this.minInequalitySign, this.maxInequalitySign],
            unassignedChecks: this.unassignedChecks,
          },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  _handleSliderValues(e, primaryInputs, secondaryInputs) {
    let minValue = parseFloat(primaryInputs[0].value),
      maxValue = parseFloat(primaryInputs[1].value);
    if (e.target.className === 'from') {
      secondaryInputs[0].value = minValue;
      this._range.style.left = minValue * 100 + '%';

      if (minValue > maxValue) {
        maxValue = primaryInputs[0].value;
        primaryInputs[1].value = maxValue;
        secondaryInputs[1].value = maxValue;
        this._range.style.right = 100 - maxValue * 100 + '%';
      }
    } else {
      secondaryInputs[1].value = maxValue;
      this._range.style.right = 100 - maxValue * 100 + '%';

      if (maxValue < minValue) {
        minValue = primaryInputs[1].value;
        primaryInputs[0].value = minValue;
        secondaryInputs[0].value = minValue;
        this._range.style.left = minValue * 100 + '%';
      }
    }

    this._range.style.backgroundImage = createGradientSlider(
      this.activeDataset,
      this._range,
      SLIDER_CONFIG.sliderWidth
    );
    [this.minValue, this.maxValue] = [
      parseFloat(minValue),
      parseFloat(maxValue),
    ];
  }

  _handleThresholdButton = (e) => {
    const { minValue, maxValue, minInequalitySign, maxInequalitySign } =
      e.target.dataset;

    [this._rangeInput[0].value, this._numberInput[0].value] = [
      minValue,
      minValue,
    ];
    [this._rangeInput[1].value, this._numberInput[1].value] = [
      maxValue,
      maxValue,
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

    [this.minValue, this.maxValue] = [
      parseFloat(minValue),
      parseFloat(maxValue),
    ];
    [this.minInequalitySign, this.maxInequalitySign] = [
      minInequalitySign,
      maxInequalitySign,
    ];
  };

  _handleInequalitySign(e) {
    const { newSign, newHtml } = this._switchInequalitySign(
      e.target.dataset.inequalitySign
    );
    e.target.dataset.inequalitySign = newSign;
    e.target.innerHTML = newHtml;

    if (newSign === 'gte' || newSign === 'gt') {
      this.minInequalitySign = newSign;
    } else {
      this.maxInequalitySign = newSign;
    }
  }

  _handleUnassignedCheckbox(e) {
    if (e.target.checked) {
      this.unassignedChecks = [...this.unassignedChecks, e.target.dataset.name];
    } else {
      this.unassignedChecks = this.unassignedChecks.filter(
        (item) => item !== e.target.dataset.name
      );
    }
  }

  _switchInequalitySign(sign) {
    switch (sign) {
      case 'gte':
        return { newSign: 'gt', newHtml: '&#60;' };
      case 'gt':
        return { newSign: 'gte', newHtml: '&#8804;' };
      case 'lte':
        return { newSign: 'lt', newHtml: '&#60;' };
      case 'lt':
        return { newSign: 'lte', newHtml: '&#8804;' };
    }
  }

  render() {
    const createNumberInput = (className, title, value) => html`
      <input
        type="number"
        class=${className}
        title=${title}
        value=${value}
        min=${SLIDER_CONFIG.min}
        max=${SLIDER_CONFIG.max}
        step=${SLIDER_CONFIG.step}
        @input=${(e) =>
          this._handleSliderValues(e, this._numberInput, this._rangeInput)}
      />
    `;

    const createRangeInput = (className, value) => html`
      <input
        type="range"
        class=${className}
        value=${value}
        min=${SLIDER_CONFIG.min}
        max=${SLIDER_CONFIG.max}
        step=${SLIDER_CONFIG.step}
        @input=${(e) =>
          this._handleSliderValues(e, this._rangeInput, this._numberInput)}
      />
    `;

    const createInequalitySignButton = (inequalitySign) => html`
      <button
        class="inequality-sign"
        type="button"
        data-inequality-sign=${inequalitySign}
        @click=${this._handleInequalitySign}
      >
        &#8804;
      </button>
    `;

    const createUnassignedList = () => html`
      ${this.unassignedLists.map(
        (list) => html` <input
            type="checkbox"
            id="${this.predictionScoreName}${capitalizeFirstLetter(list)}"
            data-name=${list}
            @change=${this._handleUnassignedCheckbox}
          />
          <label for="${this.predictionScoreName}${capitalizeFirstLetter(list)}"
            >${capitalizeFirstLetter(list)}
          </label>`
      )}
    `;

    return html`
      <div class="number-input">
        ${createNumberInput('from', 'Lower limit', SLIDER_CONFIG.min)}
        ${createInequalitySignButton('gte')}
        <span>Prediction score</span>
        ${createInequalitySignButton('lte')}
        ${createNumberInput('to', 'Upper limit', SLIDER_CONFIG.max)}
        ${createUnassignedList()}
      </div>
      <div class="slider">
        <div class="bar"></div>
        <ul class="ruler">
          ${map(
            range(SLIDER_CONFIG.numberOfScales + 1),
            (i) =>
              html`<li
                class="scale"
                style="
                left: calc(${(i * 100) /
                SLIDER_CONFIG.numberOfScales}% - 0.3rem)"
              >
                ${(SLIDER_CONFIG.scaleInterval * i).toFixed(1)}
              </li>`
          )}
        </ul>
        <div class="threshold">
          ${Object.entries(this.activeDataset).map(
            ([key, details], i) =>
              html` <div
                  class="threshold-line"
                  style="height:
                  ${(Object.keys(this.activeDataset).length - i) * 20 + 10}px;
                  left: ${details.min * 100}%;"
                ></div>
                <button
                  type="button"
                  class="threshold-button"
                  data-min-value=${details.min}
                  data-max-value=${details.max}
                  data-min-inequality-sign=${details.minInequalitySign}
                  data-max-inequality-sign=${details.maxInequalitySign}
                  style="left: ${details.min * 100}%;
                  top: ${(Object.keys(this.activeDataset).length - i) * 20}px;"
                  @click=${this._handleThresholdButton}
                >
                  ${key}
                </button>`
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
