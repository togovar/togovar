/**
 * RangeSliderView - Dual-range slider component for filtering numeric values
 *
 * Overview:
 * This Web Component provides a dual-slider UI for selecting a numeric range.
 * Users can adjust both minimum and maximum values, invert the selection,
 * and choose match criteria (all/any datasets) in simple search mode.
 *
 * Key Features:
 * - Dual sliders with numeric input fields
 * - Visual ruler with scale marks
 * - Range inversion (select values outside the range)
 * - Match type selection (for simple search: all/any datasets)
 * - Horizontal/vertical orientation support
 *
 * Component Architecture:
 * 1. Template definition - HTML structure with Shadow DOM
 * 2. State management - Proxy-based reactive state
 * 3. Event handling - Slider, input, and checkbox interactions
 * 4. Visual updates - Gradient track, ruler, thumb styling
 * 5. Custom events - 'range-changed' dispatched on value changes
 */

import { LitElement, html } from 'lit';
import { customElement, query, property, queryAll } from 'lit/decorators.js';
import './ConditionPathogenicityPredictionSearch/GradientSliderBar';
import { renderRuler, fillSlider, drawThumbs } from './rangeSliderUtils';
import Styles from '../../stylesheets/object/component/frequency-range.slider.scss';

// Type definitions
/** Search context type: 'simple' for frequency mode, 'advanced' for count/other modes */
type SearchType = 'simple' | 'advanced' | null;

/** Match criteria for dataset filtering (simple search only) */
type MatchType = 'all' | 'any';

/** Event detail structure for 'range-changed' custom event */
interface RangeChangedEventDetail {
  from: number;
  to: number;
  match?: MatchType;
  invert: '0' | '1';
}

const SLIDER_CONFIG = {
  min: 0,
  max: 1,
  sliderStep: 0.01,
  inputStep: 0.05,
  numberOfSteps: 10,
} as const;

/**
 * Template definitions - Shadow DOM structure
 *
 * Two templates are created:
 * 1. searchTypeSimple - Radio buttons for 'all datasets' vs 'any dataset' (simple search only)
 * 2. template - Main slider UI with inputs, ruler, and dual range sliders
 */

// Template is provided by Lit via the `render()` method below.

/**
 * RangeSlider Web Component
 *
 * Custom element that provides a dual-range slider with:
 * - Two draggable sliders for min/max selection
 * - Numeric input fields with validation
 * - Visual ruler with scale marks
 * - Gradient track showing selected/unselected regions
 * - Range inversion capability
 * - Match type selection (simple search mode)
 */
@customElement('range-slider')
class RangeSlider extends LitElement {
  /** Search type context: 'simple' enables match radio buttons and 0-1 range restriction */
  @property({ type: String, attribute: false })
  private _searchType: SearchType = null;

  /** Stored click handler for match radios so it can be removed on disconnect */
  private _matchClickHandler?: EventListener;
  /** Timeout id used when deferring adding the match click handler */
  private _searchTypeTimeoutId?: number;

  // === Shadow DOM Elements ===
  /** Root node reference (Document or ShadowRoot) - not needed with Lit */
  // removed: private root: Node;

  /** Left/lower range slider (HTML input type="range") */
  @query('#slider-1') private slider1!: HTMLInputElement;
  @query('#slider-2') private slider2!: HTMLInputElement;
  @query('#slider-track') private sliderTrack!: HTMLDivElement;

  // === Reactive Properties (Lit pattern) ===
  @property({ type: Number, reflect: true, attribute: 'data-min-value' })
  minValue: number = SLIDER_CONFIG.min;

  @property({ type: Number, reflect: true, attribute: 'data-max-value' })
  maxValue: number = SLIDER_CONFIG.max;

  @property({ type: Number, reflect: true, attribute: 'slider-step' })
  sliderStep: number = SLIDER_CONFIG.sliderStep;

  @property({ type: Number, reflect: true, attribute: 'input-step' })
  inputStep: number = SLIDER_CONFIG.inputStep;

  @property({ type: Boolean, reflect: true, attribute: 'invert' })
  invert: boolean = false;

  @property({ type: String, reflect: true, attribute: 'match' })
  match: MatchType = 'any';

  @property({ type: Number, reflect: true, attribute: 'ruler-number-of-steps' })
  rulerNumberOfSteps: number = SLIDER_CONFIG.numberOfSteps;

  @queryAll('.number-input > input[type="number"]')
  private _numberInput!: NodeListOf<HTMLInputElement>;
  @queryAll('.range-input  > input[type="range"]')
  private _rangeInput!: NodeListOf<HTMLInputElement>;

  /**
   * Optional dataset for gradient-slider-bar visualization.
   * RangeSliderView doesn't use threshold buttons (showThresholds=false),
   * but uses the bar for visual gradient display.
   * Empty by default = no gradient, just solid color bar.
   */
  @property({ type: Object })
  activeDataset: Record<
    string,
    {
      color: string;
      min: number;
      max: number;
      minInequalitySign: string;
      maxInequalitySign: string;
    }
  > = {};

  private _resizeObserver?: ResizeObserver;

  constructor() {
    super();
    this._searchType = null; // Will be set by parent component

    // Setup Shadow DOM
    // Lit will handle ShadowRoot and rendering. Element queries happen in firstUpdated().
  }

  /**
   * Query and cache references to Shadow DOM elements
   * Called once during construction to avoid repeated queries
   */
  // _initializeElements removed; queries are provided by @query decorators

  /**
   * Lit lifecycle: React to property changes
   *
   * Dispatch events and update visuals when properties change.
   * DOM synchronization is handled automatically by Lit's template bindings.
   */
  updated(changedProperties: Map<string | number | symbol, unknown>): void {
    // When searchType changes, ensure visual elements are rendered after DOM update
    if (changedProperties.has('_searchType')) {
      // Use setTimeout to ensure DOM is updated after render
      setTimeout(() => {
        this._fillSlider();
        this._reRenderRuler();
      }, 0);
    }

    // Update visual representation when values change
    if (
      changedProperties.has('minValue') ||
      changedProperties.has('maxValue') ||
      changedProperties.has('invert')
    ) {
      this._fillSlider();
    }

    if (changedProperties.has('rulerNumberOfSteps')) {
      this._reRenderRuler();
    }

    // Dispatch range-changed event when relevant properties change
    if (
      changedProperties.has('minValue') ||
      changedProperties.has('maxValue') ||
      changedProperties.has('match') ||
      changedProperties.has('invert')
    ) {
      const detail: RangeChangedEventDetail = {
        from: this.minValue,
        to: this.maxValue,
        match: this.match,
        invert: this.invert ? '1' : '0',
      };

      this.dispatchEvent(
        new CustomEvent<RangeChangedEventDetail>('range-changed', {
          detail,
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  // === Lit rendering ===
  static styles = [Styles];

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

      if (minValue > maxValue) {
        maxValue = parseFloat(primaryInputs[0].value);
        primaryInputs[1].value = String(maxValue);
        secondaryInputs[1].value = String(maxValue);
      }
    } else {
      secondaryInputs[1].value = String(maxValue);

      if (maxValue < minValue) {
        minValue = parseFloat(primaryInputs[1].value);
        primaryInputs[0].value = String(minValue);
        secondaryInputs[0].value = String(minValue);
      }
    }

    // Apply simpleSearch mode restrictions (0-1 range)
    const isSimpleSearch = this.searchType === 'simple';
    if (isSimpleSearch) {
      minValue = Math.max(0, Math.min(1, minValue));
      maxValue = Math.max(0, Math.min(1, maxValue));
    }

    // Update reactive properties (for visual updates and events)
    this.minValue = minValue;
    this.maxValue = maxValue;
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
        part="num-input"
        part="limit-input"
        min=${SLIDER_CONFIG.min}
        max=${SLIDER_CONFIG.max}
        step=${SLIDER_CONFIG.inputStep}
        @input=${(e: Event) =>
          this._handleSliderValues(e, this._numberInput, this._rangeInput)}
      />
    `;

    const createRangeInput = (className: 'from' | 'to', value: number) => html`
      <input
        part="slider"
        type="range"
        class=${className}
        name="slider-${className === 'from' ? '1' : '2'}"
        id="slider-${className === 'from' ? '1' : '2'}"
        .value=${String(value)}
        min=${SLIDER_CONFIG.min}
        max=${SLIDER_CONFIG.max}
        step=${SLIDER_CONFIG.sliderStep}
        @input=${(e: Event) =>
          this._handleSliderValues(e, this._rangeInput, this._numberInput)}
      />
    `;

    return html`
      <div class="wrapper" part="wrapper">
        <div class="input number-input" part="div-input">
          ${createNumberInput('from', 'Lower limit', this.minValue)} ~
          ${createNumberInput('to', 'Upper limit', this.maxValue)}
          <label part="checkbox-label label">
            <input
              class="invert"
              type="checkbox"
              part="checkbox"
              .checked=${this.invert}
              @change=${this._invertChange}
            />Invert range
          </label>
        </div>

        <div class="meter range-input" part="meter">
          <gradient-slider-bar
            .activeDataset=${this.activeDataset}
            .minValue=${this.minValue}
            .maxValue=${this.maxValue}
            .numberOfScales=${this.rulerNumberOfSteps}
            .sliderWidth=${this.sliderTrack
              ? this.sliderTrack.clientWidth
              : 247.5}
            .showThresholds=${false}
          ></gradient-slider-bar>

          ${createRangeInput('from', this.minValue)}
          ${createRangeInput('to', this.maxValue)}
        </div>

        ${this.searchType === 'simple'
          ? html`
              <div class="match" part="match">
                <label part="match label">
                  <input class="all" name="match" type="radio" value="all" />
                  for all datasets
                </label>
                <label part="label">
                  <input
                    class="any"
                    checked
                    name="match"
                    type="radio"
                    value="any"
                  />
                  for any dataset
                </label>
              </div>
            `
          : ''}
      </div>
    `;
  }

  /**
   * Re-render ruler scale marks
   *
   * Creates scale divs evenly distributed across the slider width.
   * Each scale shows a numeric label (e.g., 0.0, 0.1, 0.2, ..., 1.0).
   * Called when ruler-number-of-steps changes.
   */
  private _reRenderRuler(): void {
    const ruler = this.shadowRoot?.querySelector('.ruler');
    if (!ruler) return;

    renderRuler({
      rulerElement: ruler,
      rulerNumberOfSteps: this.rulerNumberOfSteps,
      min: this.minValue,
      max: this.maxValue,
    });
  }

  /**
   * Update slider track gradient to show selected/unselected regions
   *
   * Visual representation:
   * - Normal mode: Light gray | BLUE selected range | Light gray
   * - Inverted mode: BLUE | Light gray unselected range | BLUE
   *
   * The gradient uses CSS variables:
   * - var(--color-light-gray): Unselected regions
   * - var(--color-key-dark1): Selected regions
   */
  private _fillSlider(): void {
    if (!this.slider1 || !this.slider2 || !this.sliderTrack) return;

    fillSlider({
      slider1: this.slider1,
      slider2: this.slider2,
      sliderTrack: this.sliderTrack,
      min: this.minValue,
      max: this.maxValue,
      invert: this.invert ? '1' : '0',
    });

    // Update thumb borders to show which is left/right
    this._drawThumbs();
  }

  /**
   * Update slider thumb borders dynamically based on slider positions
   *
   * Visual feedback:
   * - Left thumb: Border on right side
   * - Right thumb: Border on left side
   *
   * Uses dynamic CSS injection to target specific slider thumbs.
   */
  private _drawThumbs(): void {
    const styleElement = this.shadowRoot?.querySelector(
      "style[data='slider-track-style']"
    ) as HTMLStyleElement | null;

    if (!styleElement || !this.slider1 || !this.slider2) return;

    drawThumbs({
      slider1: this.slider1,
      slider2: this.slider2,
      styleElement,
    });
  }

  /** Get search type (determines behavior: simple vs advanced mode) */
  get searchType(): SearchType {
    return this._searchType;
  }

  /**
   * Set search type and conditionally add match type UI
   *
   * 'simple' mode:
   * - Adds radio buttons for "all datasets" vs "any dataset"
   * - Restricts value range to 0-1 (frequency mode)
   * - Used in simple search context
   *
   * 'advanced' mode:
   * - No match type UI
   * - Allows values > 1 (count mode)
   * - Used in advanced search context
   */
  set searchType(value: SearchType) {
    const oldValue = this._searchType;
    this._searchType = value;

    // Request update to trigger re-render when searchType changes
    this.requestUpdate('_searchType', oldValue);

    // Rendering of match radio buttons is handled by `render()` when searchType === 'simple'.
    // Add a delegated listener to the component root so clicks on the radios are handled.
    if (value === 'simple') {
      // Ensure previous timeout/listener cleared
      if (this._searchTypeTimeoutId) {
        clearTimeout(this._searchTypeTimeoutId);
        this._searchTypeTimeoutId = undefined;
      }

      // Prepare handler once so it can be removed later
      if (!this._matchClickHandler) {
        this._matchClickHandler = (e: Event) => {
          const target = e.target as HTMLInputElement;
          if (target && target.tagName === 'INPUT') {
            this.match = target.value as MatchType;
            // Event will be dispatched automatically via updated() lifecycle
          }
        };
      }

      // Defer attaching until DOM rendered, but keep the timeout id so we can cancel
      this._searchTypeTimeoutId = window.setTimeout(() => {
        const simpleSearchDiv = this.renderRoot?.querySelector('.match');
        if (simpleSearchDiv && this._matchClickHandler)
          simpleSearchDiv.addEventListener(
            'click',
            this._matchClickHandler as EventListener
          );
      }, 0);
    } else {
      // If switching away from simple mode, remove any handler attached
      const simpleSearchDiv = this.renderRoot?.querySelector('.match');
      if (simpleSearchDiv && this._matchClickHandler)
        simpleSearchDiv.removeEventListener(
          'click',
          this._matchClickHandler as EventListener
        );
      if (this._searchTypeTimeoutId) {
        clearTimeout(this._searchTypeTimeoutId);
        this._searchTypeTimeoutId = undefined;
      }
    }
  }

  firstUpdated(): void {
    // Observe size changes to keep sliderWidth in sync for gradient-slider-bar
    if ('ResizeObserver' in window && this.sliderTrack) {
      this._resizeObserver = new ResizeObserver(() => {
        const gradientBar = this.sliderTrack.querySelector(
          'gradient-slider-bar'
        ) as HTMLElement & { sliderWidth?: number };
        if (gradientBar) {
          gradientBar.sliderWidth = this.sliderTrack.clientWidth;
        }
      });
      this._resizeObserver.observe(this.sliderTrack);
    }

    // Render initial visuals
    this._fillSlider();
    this._reRenderRuler();
  }

  // === Event Handler Methods ===

  /** Handle invert checkbox toggle */
  private _invertChange = (e: Event): void => {
    // Update reactive property (this will trigger updated() lifecycle)
    this.invert = (e.target as HTMLInputElement).checked;
  };

  /**
   * Custom Element lifecycle - called when element is removed from DOM
   *
   * Cleanup: Remove all event listeners to prevent memory leaks
   */
  disconnectedCallback(): void {
    super.disconnectedCallback();

    // Event listeners in render() (number/range inputs, invert checkbox) are auto-cleaned by Lit

    // Clean up ResizeObserver
    if (this._resizeObserver && this.sliderTrack) {
      this._resizeObserver.unobserve(this.sliderTrack);
      this._resizeObserver.disconnect();
      this._resizeObserver = undefined;
    }

    // Clean up match handler and any pending timeout
    if (this._matchClickHandler) {
      const simpleSearchDiv = this.renderRoot?.querySelector('.match');
      if (simpleSearchDiv)
        simpleSearchDiv.removeEventListener(
          'click',
          this._matchClickHandler as EventListener
        );
      this._matchClickHandler = undefined;
    }
    if (this._searchTypeTimeoutId) {
      clearTimeout(this._searchTypeTimeoutId);
      this._searchTypeTimeoutId = undefined;
    }
  }
}

// Element is registered via @customElement; export the class for tests/consumers
export default RangeSlider;
