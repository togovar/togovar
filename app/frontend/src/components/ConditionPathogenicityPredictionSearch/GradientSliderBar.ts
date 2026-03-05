import { LitElement, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { range } from 'lit/directives/range.js';
import { createGradientSlider } from './createGradientSlider';
import type { Inequality } from './../../types';
import Styles from '../../../stylesheets/object/component/gradient-slider-bar.scss';

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

  /** Width of slider in pixels for gradient calculation (deprecated, use actual element width) */
  // @property({ type: Number })
  // sliderWidth = 247.5;

  /** Invert range (visual indication for inverted selection) */
  @property({ type: Boolean })
  invert = false;

  @query('.slider')
  private _sliderElement!: HTMLDivElement;

  @query('.bar')
  private _barElement!: HTMLDivElement;

  @query('.bar2')
  private _barElement2?: HTMLDivElement;

  updated(changedProps: Map<string | number | symbol, unknown>): void {
    if (
      changedProps.has('activeDataset') ||
      changedProps.has('minValue') ||
      changedProps.has('maxValue') ||
      changedProps.has('invert')
    ) {
      this._updateBarStyle();
    }
  }

  private _updateBarStyle(): void {
    if (!this._barElement) return;

    if (!this.invert) {
      // Normal mode: single bar showing selected range
      this._setNormalBarMode();
    } else {
      // Invert mode: two bars showing ranges outside selection
      this._setInvertBarMode();
    }

    const sliderWidth = this._sliderElement.getBoundingClientRect().width;

    // If the element has not yet been laid out, retry after the next paint
    if (sliderWidth === 0) {
      requestAnimationFrame(() => this._updateBarStyle());
      return;
    }

    const gradientImage = createGradientSlider(
      this.activeDataset || {},
      this._sliderElement,
      sliderWidth
    );

    // Apply gradient to the slider container (fixed position, not the moving bar)
    // When no gradient, use the active color so the selected range is visible
    if (gradientImage === 'none') {
      this._sliderElement.style.backgroundImage = 'none';
      this._sliderElement.style.backgroundColor = '#117f93';
    } else {
      this._sliderElement.style.backgroundImage = gradientImage;
      this._sliderElement.style.backgroundColor = '';
    }
  }

  /**
   * Sets normal bar display mode: gray masks cover non-selected regions (0-minValue, maxValue-1)
   * so the gradient on the slider is visible only in the selected range.
   */
  private _setNormalBarMode(): void {
    // Left gray mask: 0 to minValue
    this._barElement.style.left = '0%';
    this._barElement.style.width = this.minValue * 100 + '%';
    this._barElement.style.right = '';
    this._barElement.style.backgroundImage = '';
    this._barElement.style.backgroundColor = '#ddd';

    // Right gray mask: maxValue to 100%
    if (this._barElement2) {
      this._barElement2.style.left = this.maxValue * 100 + '%';
      this._barElement2.style.width = (1 - this.maxValue) * 100 + '%';
      this._barElement2.style.right = '';
      this._barElement2.style.backgroundImage = '';
      this._barElement2.style.backgroundColor = '#ddd';
    }
  }

  /**
   * Sets inverted bar display mode: gray mask covers the excluded range (minValue-maxValue)
   * so the gradient on the slider is visible in the ranges outside the selection.
   */
  private _setInvertBarMode(): void {
    // Center gray mask: minValue to maxValue
    this._barElement.style.left = this.minValue * 100 + '%';
    this._barElement.style.width = (this.maxValue - this.minValue) * 100 + '%';
    this._barElement.style.right = '';
    this._barElement.style.backgroundImage = '';
    this._barElement.style.backgroundColor = '#ddd';

    // Hide second bar in invert mode
    if (this._barElement2) {
      this._barElement2.style.width = '0%';
      this._barElement2.style.backgroundImage = '';
      this._barElement2.style.backgroundColor = '';
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
      <div class="slider ${this.invert ? 'inverted' : ''}" part="slider">
        <div class="bar bar1" part="bar"></div>
        <div class="bar bar2" part="bar"></div>

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
