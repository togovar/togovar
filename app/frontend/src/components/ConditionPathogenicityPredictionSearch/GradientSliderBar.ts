import { LitElement, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { range } from 'lit/directives/range.js';
import { createGradientSlider } from './createGradientSlider';
import type { Inequality } from './../../types';
import Styles from '../../../stylesheets/object/component/prediction-range-slider.scss';

export interface ThresholdSelectedDetail {
  key: string;
  minValue: number;
  maxValue: number;
  minInequalitySign: Inequality;
  maxInequalitySign: Inequality;
}

/**
 * Reusable gradient slider bar component
 * Displays a slider with gradient background, ruler, and threshold buttons
 */
@customElement('gradient-slider-bar')
export class GradientSliderBar extends LitElement {
  static styles = [Styles];

  /** Threshold data for gradient generation and threshold buttons (optional) */
  @property({ type: Object })
  activeDataset?: Record<
    string,
    {
      color: string;
      min: number;
      max: number;
      minInequalitySign: Inequality;
      maxInequalitySign: Inequality;
    }
  >;

  /** Minimum value (0-1) for slider position */
  @property({ type: Number })
  minValue = 0;

  /** Maximum value (0-1) for slider position */
  @property({ type: Number })
  maxValue = 1;

  /** Number of scale marks to display on ruler */
  @property({ type: Number })
  numberOfScales = 10;

  /** Width of slider in pixels for gradient calculation */
  @property({ type: Number })
  sliderWidth = 247.5;

  @query('.bar')
  private _barElement!: HTMLDivElement;

  updated(changedProps: Map<string | number | symbol, unknown>): void {
    if (
      changedProps.has('activeDataset') ||
      changedProps.has('minValue') ||
      changedProps.has('maxValue')
    ) {
      this._updateBarStyle();
    }
  }

  private _updateBarStyle(): void {
    if (!this._barElement) return;

    this._barElement.style.left = this.minValue * 100 + '%';
    this._barElement.style.right = 100 - this.maxValue * 100 + '%';

    const gradientImage = createGradientSlider(
      this.activeDataset || {},
      this._barElement,
      this.sliderWidth
    );

    // If no gradient (activeDataset is empty or undefined), use default solid color
    if (gradientImage === 'none') {
      this._barElement.style.backgroundImage = 'none';
      this._barElement.style.backgroundColor = '#0f6272';
    } else {
      this._barElement.style.backgroundImage = gradientImage;
      this._barElement.style.backgroundColor = '';
    }
  }

  private _handleThresholdClick(e: Event): void {
    const btn = e.currentTarget as HTMLButtonElement;
    const detail: ThresholdSelectedDetail = {
      key: btn.dataset.key || '',
      minValue: parseFloat(btn.dataset.minValue || '0'),
      maxValue: parseFloat(btn.dataset.maxValue || '1'),
      minInequalitySign: (btn.dataset.minInequalitySign as Inequality) || 'gte',
      maxInequalitySign: (btn.dataset.maxInequalitySign as Inequality) || 'lte',
    };

    this.dispatchEvent(
      new CustomEvent<ThresholdSelectedDetail>('threshold-selected', {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const SCALE_INTERVAL = 1 / this.numberOfScales;
    const hasActiveDataset =
      this.activeDataset && Object.keys(this.activeDataset).length > 0;

    return html`
      <div class="slider" part="slider">
        <div class="bar" part="bar"></div>

        <ul class="ruler" part="ruler">
          ${map(
            range(this.numberOfScales + 1),
            (i) => html`<li
              class="scale"
              part="scale"
              style="left: calc(${(i * 100) / this.numberOfScales}% - 0.3rem)"
            >
              ${(SCALE_INTERVAL * i).toFixed(1)}
            </li>`
          )}
        </ul>

        ${hasActiveDataset
          ? html`
              <div class="threshold">
                ${Object.entries(this.activeDataset!).map(
                  ([key, details], i, arr) => html`
                    <div
                      class="threshold-line"
                      style="height:${(arr.length - i) * 20 +
                      10}px; left:${details.min * 100}%;"
                    ></div>
                    <button
                      type="button"
                      class="threshold-button"
                      data-key=${key}
                      data-min-value=${details.min}
                      data-max-value=${details.max}
                      data-min-inequality-sign=${details.minInequalitySign}
                      data-max-inequality-sign=${details.maxInequalitySign}
                      style="left:${details.min * 100}%; top:${(arr.length -
                        i) *
                      20}px;"
                      @click=${this._handleThresholdClick}
                    >
                      ${key}
                    </button>
                  `
                )}
              </div>
            `
          : ''}
      </div>
    `;
  }
}
