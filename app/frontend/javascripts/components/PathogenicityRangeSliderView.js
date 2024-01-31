import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { query } from 'lit/decorators/query.js';
import { queryAll } from 'lit/decorators/query-all.js';
import Styles from '../../stylesheets/object/component/pathogenicity-range-slider.scss';

const SLIDER_CONFIG = {
  min: 0,
  max: 1,
  step: 0.01,
  rulerNumberOfSteps: 10,
  sliderWidth: 247.5,
};

/** Class to create a PathogenicityRangeSlider */
@customElement('pathogenicity-range-slider')
class PathogenicityRangeSlider extends LitElement {
  static styles = [Styles];

  @property({ type: Object }) pathogenicityThreshold;

  @queryAll('.number-input input') _numberInput;
  @queryAll('.range-input input') _rangeInput;
  @query('.slider') _slider;
  @query('.slider .progress') _range;
  @query('.slider .ruler') _ruler;
  @query('.slider .threshold') _threshold;
  @queryAll('.slider > .threshold > .threshold-line') _thresholdLines;
  @queryAll('.slider > .threshold > .threshold-button') _thresholdButtons;

  firstUpdated() {
    this._handleTextInput();
    this._handleRangeInput();

    this._renderRuler();
    this._renderThreshold();

    this._handleThresholdButton();

    this._handleScale();
  }

  _handleTextInput() {
    this._updateSliderValue(this._numberInput, this._rangeInput, 'input-min');
  }

  _handleRangeInput() {
    this._updateSliderValue(this._rangeInput, this._numberInput, 'range-min');
  }

  _updateSliderValue(primaryInputs, secondaryInputs, primaryClassName) {
    primaryInputs.forEach((input) => {
      input.addEventListener('input', (e) => {
        let minVal = parseFloat(primaryInputs[0].value),
          maxVal = parseFloat(primaryInputs[1].value);

        if (e.target.className === primaryClassName) {
          secondaryInputs[0].value = minVal;
          this._range.style.left = minVal * 100 + '%';

          if (minVal > maxVal) {
            maxVal = primaryInputs[0].value;
            primaryInputs[1].value = maxVal;
            secondaryInputs[1].value = maxVal;
            this._range.style.right = 100 - maxVal * 100 + '%';
          }
        } else {
          secondaryInputs[1].value = maxVal;
          this._range.style.right = 100 - maxVal * 100 + '%';

          if (maxVal < minVal) {
            minVal = primaryInputs[1].value;
            primaryInputs[0].value = minVal;
            secondaryInputs[0].value = minVal;
            this._range.style.left = minVal * 100 + '%';
          }
        }
        this._range.style.backgroundImage = this._createGradient();

        this._setAttributes(minVal, maxVal);
      });
    });
  }

  _renderRuler() {
    this._ruler.innerHTML = '';
    const min = parseFloat(SLIDER_CONFIG.min);
    const max = parseFloat(SLIDER_CONFIG.max);
    const rulerNumberOfSteps = parseInt(SLIDER_CONFIG.rulerNumberOfSteps);
    const step = (max - min) / rulerNumberOfSteps;
    for (let i = 0; i <= rulerNumberOfSteps; i++) {
      const scale = document.createElement('div');
      scale.className = 'scale';
      scale.innerText = (min + i * step).toFixed(1);
      scale.style.left = `calc(${(i * 100) / rulerNumberOfSteps}% - 0.3rem)`;
      this._ruler.appendChild(scale);
    }
  }

  _renderThreshold() {
    const thresholdValues = Object.values(this.pathogenicityThreshold).map(
      (threshold) => threshold.min
    );

    this._thresholdLines.forEach((line, i) => {
      line.style.height = `${(thresholdValues.length - i) * 20 + 10}px`;
      line.style.left = `${thresholdValues[i] * 100}%`;
    });

    this._thresholdButtons.forEach((button, i) => {
      button.dataset.threshold = Object.keys(this.pathogenicityThreshold)[i];
      button.dataset.max = Object.values(this.pathogenicityThreshold)[i].max;
      button.dataset.min = Object.values(this.pathogenicityThreshold)[i].min;
      button.textContent = Object.keys(this.pathogenicityThreshold)[i];

      button.style.left = `${thresholdValues[i] * 100}%`;
      button.style.top = `${(thresholdValues.length - i) * 20}px`;
    });
  }

  _handleThresholdButton = () => {
    this._thresholdButtons.forEach((button) => {
      button.addEventListener('click', (e) => {
        const target = e.target;
        this._rangeInput[0].value = target.dataset.min;
        this._rangeInput[1].value = target.dataset.max;
        this._numberInput[0].value = target.dataset.min;
        this._numberInput[1].value = target.dataset.max;
        this._range.style.left = target.dataset.min * 100 + '%';
        this._range.style.right = 100 - target.dataset.max * 100 + '%';
        this._range.style.backgroundImage = this._createGradient();

        this._setAttributes(target.dataset.min, target.dataset.max);
      });
    });
  };

  _handleScale() {
    this._range.style.backgroundImage = this._createGradient();

    this._rangeInput.forEach((slider) => {
      slider.addEventListener('input', () => {
        this._range.style.backgroundImage = this._createGradient();
      });
    });
  }

  _createGradient() {
    const gradientStops = Object.entries(this.pathogenicityThreshold).flatMap(
      ([_, value]) => {
        return [
          { color: value.color, division: value.min },
          { color: value.color, division: value.max },
        ];
      }
    );

    let rangeLeft = parseInt(this._range.style.left) / 100 || 0;

    const gradientCss = gradientStops
      .map((stop) => {
        const position =
          (stop.division - rangeLeft) * SLIDER_CONFIG.sliderWidth;
        return `${stop.color} ${position}px`;
      })
      .join(', ');

    return `linear-gradient(to right, ${gradientCss})`;
  }

  _setAttributes(minVal, maxVal) {
    this._numberInput[0].setAttribute('value', minVal);
    this._numberInput[1].setAttribute('value', maxVal);
    this._rangeInput[0].setAttribute('value', minVal);
    this._rangeInput[1].setAttribute('value', maxVal);

    this.dispatchEvent(
      new CustomEvent('set-value', {
        detail: { minVal: minVal, maxVal: maxVal },
        bubbles: true,
        composed: true,
      })
    );
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
      />
    `;

    return html`
      <div class="number-input">
        ${createNumberInput('input-min', 'Lower limit', SLIDER_CONFIG.min)}
        <div class="separator">~</div>
        ${createNumberInput('input-max', 'Upper limit', SLIDER_CONFIG.max)}
      </div>
      <div class="slider">
        <div class="progress"></div>
        <div class="ruler"></div>
        <div class="threshold">
          ${Object.entries(this.pathogenicityThreshold).map(
            () => html`<div class="threshold-line"></div>
              <button type="button" class="threshold-button"></button>`
          )}
        </div>
      </div>
      <div class="range-input">
        ${createRangeInput('range-min', SLIDER_CONFIG.min)}
        ${createRangeInput('range-max', SLIDER_CONFIG.max)}
      </div>
    `;
  }
}

export default PathogenicityRangeSlider;
