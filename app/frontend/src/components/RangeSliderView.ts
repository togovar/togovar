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

import { LitElement, html, css } from 'lit';
import { customElement, query, property } from 'lit/decorators.js';
// Ensure the gradient slider webcomponent is registered
import './ConditionPathogenicityPredictionSearch/GradientSliderBar';
import type { Inequality } from '../types';
import { renderRuler, fillSlider, drawThumbs } from './rangeSliderUtils';

// Type definitions
/** Search context type: 'simple' for frequency mode, 'advanced' for count/other modes */
type SearchType = 'simple' | 'advanced' | null;

/** Slider orientation for layout */
type Orientation = 'horizontal' | 'vertical';

/** Match criteria for dataset filtering (simple search only) */
type MatchType = 'all' | 'any';

/** Internal state structure with all slider configuration and values */
interface RangeSliderState {
  from: number; // Lower bound value
  to: number; // Upper bound value
  invert: '0' | '1'; // '1' = inverted range (exclude values between from-to)
  min: number; // Minimum allowed value
  max: number; // Maximum allowed value
  'input-step': number; // Step size for number inputs
  'slider-step': number; // Step size for range sliders
  step?: number; // Legacy step property
  match: MatchType; // Dataset match criteria (all/any)
  rulerNumberOfSteps: number; // Number of scale marks on ruler
}

/** Event detail structure for 'range-changed' custom event */
interface RangeChangedEventDetail {
  from: number;
  to: number;
  match?: MatchType;
  invert: '0' | '1';
}

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
  // === State Management ===
  /** Reactive state object (wrapped in Proxy for change detection) */
  public state: RangeSliderState;

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
  @query('.from') private from!: HTMLInputElement;
  @query('.to') private to!: HTMLInputElement;
  @query('.invert') private invertChk!: HTMLInputElement;
  @query('.meter') private _meter!: HTMLDivElement;

  /** Optional dataset for the gradient bar (keys -> {min,max,color,...}), normalized 0-1 */
  @property({ type: Object })
  public activeDataset: Record<
    string,
    {
      color: string;
      min: number;
      max: number;
      minInequalitySign: Inequality;
      maxInequalitySign: Inequality;
    }
  > = {};

  // === Reactive Properties (Lit pattern) ===
  @property({ type: Number, reflect: true, attribute: 'min' })
  min: number = 0;

  @property({ type: Number, reflect: true, attribute: 'max' })
  max: number = 1;

  @property({ type: Number, reflect: true, attribute: 'slider-step' })
  sliderStep: number = 0.01;

  @property({ type: Number, reflect: true, attribute: 'input-step' })
  inputStep: number = 0.05;

  @property({ type: Number, reflect: true, attribute: 'value1' })
  value1: number = 0;

  @property({ type: Number, reflect: true, attribute: 'value2' })
  value2: number = 1;

  @property({ type: String, reflect: true, attribute: 'orientation' })
  orientation: Orientation = 'horizontal';

  @property({ type: Boolean, reflect: true, attribute: 'invert' })
  invert: boolean = false;

  @property({ type: String, reflect: true, attribute: 'match' })
  match: MatchType = 'any';

  @property({ type: Number, reflect: true, attribute: 'ruler-number-of-steps' })
  rulerNumberOfSteps: number = 10;

  private _resizeObserver?: ResizeObserver;

  private _onThresholdSelected = (e: Event): void => {
    const ce = e as CustomEvent;
    const detail = ce.detail as
      | { minValue: number; maxValue: number }
      | undefined;
    if (!detail) return;

    // Convert normalized (0-1) values to absolute slider values
    const minAbs =
      this.state.min + detail.minValue * (this.state.max - this.state.min);
    const maxAbs =
      this.state.min + detail.maxValue * (this.state.max - this.state.min);

    // Update state (Proxy will handle ordering and events)
    this.state.from = minAbs;
    this.state.to = maxAbs;
  };

  private _normalizedMin(): number {
    const min = this.state.min;
    const max = this.state.max;
    if (max === min) return 0;
    const val = Math.min(this.state.from, this.state.to);
    return Math.max(0, Math.min(1, (val - min) / (max - min)));
  }

  private _normalizedMax(): number {
    const min = this.state.min;
    const max = this.state.max;
    if (max === min) return 1;
    const val = Math.max(this.state.from, this.state.to);
    return Math.max(0, Math.min(1, (val - min) / (max - min)));
  }

  constructor() {
    super();

    // Initialize default state
    const initState: RangeSliderState = {
      from: 0, // Lower bound
      to: 1, // Upper bound
      invert: '0', // Not inverted
      min: 0, // Min allowed value
      max: 1, // Max allowed value
      'input-step': 0.05, // Number input step
      'slider-step': 0.01, // Slider step
      match: 'any', // Match any dataset (simple search)
      rulerNumberOfSteps: 10, // 10 scale marks
    };

    this.state = initState;
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
   * This replaces the old attributeChangedCallback pattern.
   * Called after any reactive property changes.
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

    // Check if DOM elements are available
    const domReady =
      !!this.slider1 &&
      !!this.slider2 &&
      !!this.from &&
      !!this.to &&
      !!this.sliderTrack;

    if (!domReady) return;

    // Sync property changes to DOM elements and state
    if (changedProperties.has('min')) {
      this.state.min = this.min;
      this.slider1.min = String(this.min);
      this.slider2.min = String(this.min);
      this.from.min = String(this.min);
      this.to.min = String(this.min);
    }

    if (changedProperties.has('max')) {
      this.state.max = this.max;
      this.slider1.max = String(this.max);
      this.slider2.max = String(this.max);
      this.from.max = String(this.max);
      this.to.max = String(this.max);
    }

    if (changedProperties.has('sliderStep')) {
      this.state['slider-step'] = this.sliderStep;
      this.slider1.step = String(this.sliderStep);
      this.slider2.step = String(this.sliderStep);
    }

    if (changedProperties.has('inputStep')) {
      this.state['input-step'] = this.inputStep;
      this.from.step = String(this.inputStep);
      this.to.step = String(this.inputStep);
    }

    if (changedProperties.has('value1')) {
      const parsedValue = this.value1;
      this.state.from = Math.min(parsedValue, this.state.to);
      this.slider1.value = parsedValue.toFixed(3);
    }

    if (changedProperties.has('value2')) {
      const parsedValue = this.value2;
      this.state.to = Math.max(parsedValue, this.state.from);
      this.slider2.value = parsedValue.toFixed(3);
    }

    if (changedProperties.has('invert')) {
      this.state.invert = this.invert ? '1' : '0';
      this.invertChk.checked = this.invert;
    }

    if (changedProperties.has('rulerNumberOfSteps')) {
      this.state.rulerNumberOfSteps = this.rulerNumberOfSteps;
      this._reRenderRuler();
    }

    if (changedProperties.has('match')) {
      this.state.match = this.match;
    }

    if (changedProperties.has('orientation')) {
      if (this.orientation === 'vertical') {
        this._meter.classList.add('-vertical');
      } else {
        this._meter.classList.remove('-vertical');
      }
      this._reRenderRuler();
    }

    // Update visual slider track after any property change
    if (changedProperties.size > 0) {
      this._fillSlider();
    }
  }

  // === Lit rendering ===
  static styles = css``;

  render() {
    return html`
      <style>
        input[type='range']::-webkit-slider-runnable-track {
          -webkit-appearance: none;
          height: 8px;
        }
        .-vertical {
          transform: rotate(-90deg);
        }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 1em;
          width: 3px;
          background-color: transparent;
          border-top: solid 1px rgba(0, 0, 0, 0.5);
          border-bottom: solid 1px rgba(0, 0, 0, 0.5);
          cursor: col-resize;
          pointer-events: auto;
          margin-top: -0.2em;
        }
      </style>

      <div class="wrapper" part="wrapper">
        <div class="input" part="div-input">
          <input
            class="from"
            part="num-input"
            type="number"
            part="limit-input"
            title="Lower limit"
          />
          ~
          <input
            class="to"
            part="num-input"
            type="number"
            part="limit-input"
            title="Upper limit"
          />
          <label part="checkbox-label label">
            <input class="invert" type="checkbox" part="checkbox" />Invert range
          </label>
        </div>

        <div class="meter" part="meter">
          <div class="meter-container" part="meter-container">
            <div class="slider-track" id="slider-track" part="slider-track">
              <style data="slider-track-style"></style>
              <div class="ruler" part="ruler"></div>
              <!-- Embed reusable gradient bar when dataset is provided -->
              <gradient-slider-bar
                .activeDataset=${this.activeDataset}
                .minValue=${this._normalizedMin()}
                .maxValue=${this._normalizedMax()}
                .numberOfScales=${this.state.rulerNumberOfSteps}
                .sliderWidth=${(this.sliderTrack &&
                  this.sliderTrack.clientWidth) ||
                247.5}
              ></gradient-slider-bar>
            </div>

            <input part="slider" type="range" name="slider-1" id="slider-1" />
            <input part="slider" type="range" name="slider-2" id="slider-2" />
          </div>
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
   * Called when ruler-number-of-steps or orientation changes.
   */
  private _reRenderRuler(): void {
    const ruler = this.shadowRoot?.querySelector('.ruler');
    if (!ruler) return;
    
    renderRuler({
      rulerElement: ruler,
      rulerNumberOfSteps: this.state.rulerNumberOfSteps,
      min: this.state.min,
      max: this.state.max,
      orientation: this.orientation,
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
      min: this.min,
      max: this.max,
      invert: this.state.invert,
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
            this.state.match = target.value as MatchType;
            this._fireEvent(this.state);
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

  /**
   * Dispatch 'range-changed' custom event
   *
   * Event detail contains:
   * - from: Lower bound value
   * - to: Upper bound value
   * - invert: '0' or '1'
   * - match: 'all' or 'any' (if applicable)
   *
   * This event bubbles up to parent components for state synchronization.
   */
  private _fireEvent(detail: RangeSliderState): void {
    const eventKeys: Array<keyof RangeChangedEventDetail> = [
      'from',
      'to',
      'match',
      'invert',
    ];

    // Filter state to only include event-relevant properties
    const eventData = Object.fromEntries(
      Object.entries(detail).filter(([key]) =>
        eventKeys.includes(key as keyof RangeChangedEventDetail)
      )
    ) as RangeChangedEventDetail;

    const event = new CustomEvent<RangeChangedEventDetail>('range-changed', {
      bubbles: true,
      detail: eventData,
    });

    this.dispatchEvent(event);
  }
  firstUpdated(): void {
    // Initialize from reactive properties (already set via @property decorators)
    this.state.min = this.min;
    this.state.max = this.max;
    this.state['slider-step'] = this.sliderStep;
    this.state['input-step'] = this.inputStep;
    this.state.from = Math.min(this.value1, this.value2);
    this.state.to = Math.max(this.value1, this.value2);
    this.state.invert = this.invert ? '1' : '0';
    this.state.match = this.match;
    this.state.rulerNumberOfSteps = this.rulerNumberOfSteps;

    // Setup Proxy-based state for reactive updates
    this.state = new Proxy(this.state, {
      set: (
        target: RangeSliderState,
        prop: string | symbol,
        value: unknown,
        receiver: RangeSliderState
      ): boolean => {
        if (prop === 'from' || prop === 'to') {
          const valueStr = String(value);
          if (isNaN(parseFloat(valueStr))) return true;

          const parsedValue = parseFloat(valueStr);
          const isSimpleSearch = this.searchType === 'simple';

          if (isSimpleSearch && (parsedValue > 1 || parsedValue < 0)) {
            if (parsedValue > 1) {
              target.to = 1;
            }
            if (parsedValue < 0) {
              target.from = 0;
            }
          } else {
            if (parsedValue < 0) return true;
            if (prop === 'from') {
              if (parsedValue > target.to) target.to = parsedValue;
              else target.from = parsedValue;
            } else {
              if (parsedValue < target.from) target.from = parsedValue;
              else target.to = parsedValue;
            }
          }

          this._getToFromFromState();
          this._fireEvent(target);
          return true;
        } else if (prop === 'invert') {
          if (typeof value === 'boolean') target[prop] = value ? '1' : '0';
          else if (value === '0' || value === '1')
            target[prop] = value as '0' | '1';
          else target[prop] = String(value) === 'true' ? '1' : '0';

          this._getToFromFromState();
          this._fireEvent(target);
          return true;
        } else {
          this._getToFromFromState();
          return Reflect.set(target, prop, value, receiver);
        }
      },
    });

    // Apply initial values to DOM elements (already queried via @query)
    this.slider1.min = String(this.min);
    this.slider2.min = String(this.min);
    this.from.min = String(this.min);
    this.to.min = String(this.min);

    this.slider1.max = String(this.max);
    this.slider2.max = String(this.max);
    this.from.max = String(this.max);
    this.to.max = String(this.max);

    this.slider1.step = String(this.sliderStep);
    this.slider2.step = String(this.sliderStep);
    this.from.step = String(this.inputStep);
    this.to.step = String(this.inputStep);

    this.slider1.value = this.value1.toFixed(3);
    this.slider2.value = this.value2.toFixed(3);

    this.invertChk.checked = this.invert;

    // Attach event listeners
    this.slider1.addEventListener('input', this._slider1Input);
    this.slider2.addEventListener('input', this._slider2Input);
    this.from.addEventListener('change', this._fromChange);
    this.to.addEventListener('change', this._toChange);
    this.invertChk.addEventListener('change', this._invertChange);

    // Listen for threshold-selected events from gradient-slider-bar
    const grad = this.sliderTrack.querySelector('gradient-slider-bar');
    if (grad)
      grad.addEventListener(
        'threshold-selected',
        this._onThresholdSelected as EventListener
      );

    // Observe size changes to keep sliderWidth in sync
    if ('ResizeObserver' in window && this.sliderTrack) {
      this._resizeObserver = new ResizeObserver(() => {
        const g = this.sliderTrack.querySelector(
          'gradient-slider-bar'
        ) as HTMLElement | null;
        if (g)
          (g as HTMLElement & { sliderWidth?: number }).sliderWidth =
            this.sliderTrack.clientWidth;
      });
      this._resizeObserver.observe(this.sliderTrack);
    }

    // Set initial display values
    this.from.value = this._formatInputValue(this.state.from);
    this.to.value = this._formatInputValue(this.state.to);

    // Apply orientation class
    if (this.orientation === 'vertical') {
      this._meter.classList.add('-vertical');
    }

    // Render visuals
    this._fillSlider();
    this._reRenderRuler();
  }

  // === Event Handler Methods ===
  // These are arrow functions to preserve 'this' context when used as event listeners

  /** Handle slider1 drag - update 'from' value */
  private _slider1Input = (e: Event): void => {
    this.state.from = parseFloat((e.target as HTMLInputElement).value);
  };

  /** Handle slider2 drag - update 'to' value */
  private _slider2Input = (e: Event): void => {
    this.state.to = parseFloat((e.target as HTMLInputElement).value);
  };

  /**
   * Sync UI elements with current state
   *
   * Called by Proxy handler when state changes.
   * Updates:
   * - Slider positions
   * - Input field values (formatted)
   * - Gradient track
   */
  private _getToFromFromState(): void {
    // Update slider positions (ensure correct order)
    this.slider1.value = String(Math.min(this.state.from, this.state.to));
    this.slider2.value = String(Math.max(this.state.to, this.state.to));

    // Update input field displays (with formatting)
    this.from.value = this._formatInputValue(this.state.from);
    this.to.value = this._formatInputValue(this.state.to);

    // Update visual gradient
    this._fillSlider();
  }

  /**
   * Format numeric value for input field display
   *
   * Ensures consistent formatting:
   * - At least 1 decimal place (0.0, 1.0)
   * - Preserves existing precision if needed
   *
   * @param value - Numeric value to format
   * @returns Formatted string (e.g., "0.0", "0.25", "1.0")
   */
  private _formatInputValue(value: number | string): string {
    const num = parseFloat(String(value));
    if (isNaN(num)) return String(value);

    // Calculate number of decimal places to show
    const str = num.toString();
    const decimalIndex = str.indexOf('.');
    const currentDecimals =
      decimalIndex === -1 ? 0 : str.length - decimalIndex - 1;
    const decimals = Math.max(1, currentDecimals); // Minimum 1 decimal

    return num.toFixed(decimals);
  }

  /** Handle 'to' input field change */
  private _toChange = (e: Event): void => {
    this.state.to = parseFloat((e.target as HTMLInputElement).value);
  };

  /** Handle 'from' input field change */
  private _fromChange = (e: Event): void => {
    this.state.from = parseFloat((e.target as HTMLInputElement).value);
  };

  /** Handle invert checkbox toggle */
  private _invertChange = (e: Event): void => {
    this.state.invert = (e.target as HTMLInputElement).checked ? '1' : '0';
  };

  /**
   * Custom Element lifecycle - called when element is removed from DOM
   *
   * Cleanup: Remove all event listeners to prevent memory leaks
   */
  disconnectedCallback(): void {
    this.slider1.removeEventListener('input', this._slider1Input);
    this.slider2.removeEventListener('input', this._slider2Input);
    this.from.removeEventListener('change', this._fromChange);
    this.to.removeEventListener('change', this._toChange);
    this.invertChk.removeEventListener('change', this._invertChange);

    const grad =
      this.sliderTrack && this.sliderTrack.querySelector('gradient-slider-bar');
    if (grad)
      grad.removeEventListener(
        'threshold-selected',
        this._onThresholdSelected as EventListener
      );

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
