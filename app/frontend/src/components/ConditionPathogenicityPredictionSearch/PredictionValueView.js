import { LitElement, html } from 'lit';
import { customElement, state, query, queryAll } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { range } from 'lit/directives/range.js';
import { createGradientSlider } from './createGradientSlider';
import { ALPHAMISSENSE_THRESHOLD, PREDICTIONS } from './PredictionDatasets.js';
import { setInequalitySign } from './setInequalitySign.js';
import { capitalizeFirstLetter } from '../../utils/capitalizeFirstLetter';

import Styles from '../../../stylesheets/object/component/prediction-value-view.scss';

const SLIDER_CONFIG = {
  numberOfScales: 10,
  sliderWidth: 100,
};

@customElement('prediction-value-view')
export class PredictionValueView extends LitElement {
  static styles = [Styles];

  @state({ type: String }) _dataset = 'alphamissense';
  @state({ type: String }) _label = 'AlphaMissense';
  @state({ type: Array }) _values = [0, 1];
  @state({ type: Array }) _inequalitySigns = ['gte', 'lte'];
  @state({ type: Array }) _unassignedChecks = [];
  @state({ type: Object }) _activeDataset = ALPHAMISSENSE_THRESHOLD;

  @query('.bar') _bar;
  @queryAll('.inequality-sign') _inequalitySignsEl;

  firstUpdated() {
    this._setBarStyles();
  }

  setValues(dataset, values, inequalitySigns, unassignedChecks) {
    this._dataset = dataset;
    this._values = values;
    this._inequalitySigns = inequalitySigns;
    this._unassignedChecks = unassignedChecks;
    this._label = PREDICTIONS[this._dataset].label;
    this._activeDataset = PREDICTIONS[this._dataset].threshold;

    setInequalitySign(this._inequalitySignsEl[0], this._inequalitySigns[0]);
    setInequalitySign(this._inequalitySignsEl[1], this._inequalitySigns[1]);

    this._setBarStyles();
  }

  _setBarStyles() {
    this._bar.style.left = this._values[0] * 100 + '%';
    this._bar.style.right = 100 - this._values[1] * 100 + '%';
    this._bar.style.backgroundImage = createGradientSlider(
      this._activeDataset,
      this._bar,
      SLIDER_CONFIG.sliderWidth
    );
  }

  render() {
    return html`
      <div class="pathogenicity-graph">
        <div class="bar"></div>
        <ul class="ruler">
          ${map(
            range(SLIDER_CONFIG.numberOfScales + 1),
            (i) =>
              html`<li
                class="scale"
                style="
                left: calc(${(i * 100) / SLIDER_CONFIG.numberOfScales}%
                - ${i / SLIDER_CONFIG.numberOfScales}px)"
              ></li>`
          )}
        </ul>
      </div>
      <div class="range">
        <span class="from">${this._values[0]}</span>
        <span class="inequality-sign" data-inequality-sign="gte">&#8804;</span>
        <span class="text">Prediction score</span>
        <span class="inequality-sign" data-inequality-sign="lte">&#8804;</span>
        <span class="to">${this._values[1]}</span>
        <span class="text">
          ${this._unassignedChecks
            .map((item) => capitalizeFirstLetter(item))
            .join(', ')}
        </span>
      </div>
    `;
  }

  get conditionValues() {
    return {
      dataset: this._dataset,
      label: this._label,
      values: this._values,
      inequalitySigns: this._inequalitySigns,
      unassignedChecks: this._unassignedChecks,
    };
  }

  get queryValue() {
    if (this._unassignedChecks.length === 0) {
      return {
        [this._dataset]: {
          score: {
            [this._inequalitySigns[0]]: this._values[0],
            [this._inequalitySigns[1]]: this._values[1],
          },
        },
      };
    }

    if (
      this._values[0] === this._values[1] &&
      (this._inequalitySigns[0] === 'gt' || this._inequalitySigns[1] === 'lt')
    ) {
      return {
        [this._dataset]: {
          score: this._unassignedChecks,
        },
      };
    }

    return {
      or: [
        {
          [this._dataset]: {
            score: this._unassignedChecks,
          },
        },
        {
          [this._dataset]: {
            score: {
              [this._inequalitySigns[0]]: this._values[0],
              [this._inequalitySigns[1]]: this._values[1],
            },
          },
        },
      ],
    };
  }
}

export default PredictionValueView;
