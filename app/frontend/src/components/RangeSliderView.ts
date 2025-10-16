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
import { customElement, query } from 'lit/decorators.js';

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
  private _searchType: SearchType;

  /** Flag to prevent event firing during component initialization */
  private _isInitializing: boolean;

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

  /**
   * Observed attributes - Custom Element API
   * When these attributes change, attributeChangedCallback is triggered
   */
  static get observedAttributes(): string[] {
    return [
      'min', // Minimum allowed value
      'max', // Maximum allowed value
      'input-step', // Step size for number inputs
      'slider-step', // Step size for range sliders
      'value1', // Initial lower bound
      'value2', // Initial upper bound
      'orientation', // 'horizontal' or 'vertical'
      'invert', // 'true' or 'false'
      'match', // 'all' or 'any' (simple search)
      'ruler-number-of-steps', // Number of scale marks
    ];
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
    this._isInitializing = true; // Prevent events during setup

    // Setup Shadow DOM
    // Lit will handle ShadowRoot and rendering. Element queries happen in firstUpdated().
  }

  /**
   * Query and cache references to Shadow DOM elements
   * Called once during construction to avoid repeated queries
   */
  // _initializeElements removed; queries are provided by @query decorators

  /**
   * Custom Element lifecycle callback - triggered when observed attributes change
   *
   * Responsibilities:
   * 1. Sync attribute changes to HTML elements (sliders, inputs)
   * 2. Update internal state (during initialization only)
   * 3. Refresh visual elements (slider track, ruler)
   *
   * IMPORTANT: Only updates state during initialization (_isInitializing=true)
   * to prevent infinite loops between attribute changes and state changes.
   */
  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null
  ): void {
    if (!newValue) return;
    // DOM elements (slider1/slider2/from/to/etc) are only available after render/firstUpdated.
    // Check whether DOM is ready before touching element properties.
    const domReady =
      !!this.slider1 &&
      !!this.slider2 &&
      !!this.from &&
      !!this.to &&
      !!this.sliderTrack;

    switch (name) {
      case 'min':
        // update internal state regardless
        if (this.state) this.state.min = parseFloat(newValue);
        if (domReady) {
          this.slider1.min = newValue;
          this.slider2.min = newValue;
          this.from.min = newValue;
          this.to.min = newValue;
        }
        break;
      case 'max':
        if (this.state) this.state.max = parseFloat(newValue);
        if (domReady) {
          this.slider1.max = newValue;
          this.slider2.max = newValue;
          this.from.max = newValue;
          this.to.max = newValue;
        }
        break;
      case 'slider-step':
        if (this.state) this.state['slider-step'] = parseFloat(newValue);
        if (domReady) {
          this.slider1.step = newValue;
          this.slider2.step = newValue;
        }
        break;
      case 'input-step':
        if (this.state) this.state['input-step'] = parseFloat(newValue);
        if (domReady) {
          this.from.step = newValue;
          this.to.step = newValue;
        }
        break;
      case 'value1':
        // Update slider position during initialization only
        if (this._isInitializing && domReady) {
          this.slider1.value = parseFloat(newValue).toFixed(3);
        }
        // Update internal state during initialization (no DOM required)
        if (this.state && this._isInitializing) {
          const parsedValue = parseFloat(newValue);
          this.state.from = Math.min(parsedValue, this.state.to);
        }
        break;

      case 'value2':
        // Update slider position during initialization only
        if (this._isInitializing && domReady) {
          this.slider2.value = parseFloat(newValue).toFixed(3);
        }
        if (this.state && this._isInitializing) {
          const parsedValue = parseFloat(newValue);
          this.state.to = Math.max(parsedValue, this.state.from);
        }
        break;

      case 'invert':
        // Update checkbox during initialization only
        if (this._isInitializing && domReady) {
          this.invertChk.checked = newValue === 'true';
        }
        if (this.state && this._isInitializing) {
          this.state.invert = newValue === 'true' ? '1' : '0';
        }
        break;

      case 'ruler-number-of-steps':
        // Number of scale marks on ruler
        if (this.state) this.state.rulerNumberOfSteps = parseInt(newValue, 10);
        if (domReady) this._reRenderRuler();
        break;

      case 'match':
        // IMPORTANT: Don't call this.match setter to avoid infinite loop
        // Just update state directly since the attribute is already set
        if (this.state) {
          this.state.match = newValue as MatchType;
        }
        break;

      case 'orientation':
        // Apply CSS class for vertical orientation (rotates slider 90deg)
        if (domReady) {
          if (newValue === 'vertical') this._meter.classList.add('-vertical');
          else this._meter.classList.remove('-vertical');
          this._reRenderRuler(); // Reposition scale marks
        }
        break;
    }

    // Update visual slider track after any attribute change (only if DOM ready)
    if (domReady) this._fillSlider();
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
    const ruler = this.shadowRoot!.querySelector('.ruler')!;
    ruler.innerHTML = ''; // Clear existing scales

    const rulerNumberOfSteps = this.state.rulerNumberOfSteps;
    const min = this.state.min;
    const max = this.state.max;
    const step = (max - min) / rulerNumberOfSteps;

    // Create and position scale marks
    for (let i = 0; i <= rulerNumberOfSteps; i++) {
      const scale = document.createElement('div');
      scale.className = 'scale';
      scale.part.add('scale'); // CSS part for styling
      scale.part.add(`scale-${this.orientation}`); // Orientation-specific styling
      scale.innerText = (min + i * step).toFixed(1); // Numeric label
      scale.style.left = `calc(${(i * 100) / rulerNumberOfSteps}% - 0.5em`; // Position
      ruler.appendChild(scale);
    }
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
    // Get actual slider values (handle crossing)
    const val1 = Math.min(
      parseFloat(this.slider1.value),
      parseFloat(this.slider2.value)
    );
    const val2 = Math.max(
      parseFloat(this.slider1.value),
      parseFloat(this.slider2.value)
    );

    // Convert values to percentages (0-100%)
    const percentVal1 =
      (val1 * 100) / (parseFloat(this.max!) - parseFloat(this.min!));
    const percentVal2 =
      (val2 * 100) / (parseFloat(this.max!) - parseFloat(this.min!));

    // Apply gradient based on invert state
    if (this.state.invert !== '1') {
      // Normal mode: Gray - Blue - Gray
      this.sliderTrack.style.background = `linear-gradient(90deg, var(--color-light-gray) 0%, var(--color-light-gray) ${percentVal1}% , var(--color-key-dark1) ${percentVal1}%,   var(--color-key-dark1) ${percentVal2}%, var(--color-light-gray) ${percentVal2}%,  var(--color-light-gray) 100% )`;
    } else {
      // Inverted mode: Blue - Gray - Blue
      this.sliderTrack.style.background = `linear-gradient(90deg, var(--color-key-dark1) 0%, var(--color-key-dark1) ${percentVal1}%, var(--color-light-gray) ${percentVal1}%,  var(--color-light-gray) ${percentVal2}%, var(--color-key-dark1) ${percentVal2}%,  var(--color-key-dark1) 100% )`;
    }

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
    const styleElement = this.shadowRoot!.querySelector(
      "style[data='slider-track-style']"
    )!;

    // Determine which slider is on the left/right
    if (parseFloat(this.slider1.value) < parseFloat(this.slider2.value)) {
      // slider1 is left, slider2 is right
      styleElement.innerHTML = `#slider-1::-webkit-slider-thumb {
            border-right: 1px solid rgba(0, 0, 0, 0.5);
            transform: translateX(-1.5px);
        }
        #slider-2::-webkit-slider-thumb {
            border-left: 1px solid rgba(0, 0, 0, 0.5);
            transform: translateX(1.5px)
        }
        `;
    } else {
      // slider2 is left, slider1 is right
      styleElement.innerHTML = `#slider-2::-webkit-slider-thumb {
            border-right: 1px solid rgba(0, 0, 0, 0.5);
            transform: translateX(-1.5px);
        }
        #slider-1::-webkit-slider-thumb {
            border-left: 1px solid rgba(0, 0, 0, 0.5);
            transform: translateX(1.5px)
        }
        `;
    }
  }

  // === Attribute Getters/Setters ===
  // Provide public API for reading/writing component attributes

  get min(): string | null {
    return this.getAttribute('min');
  }

  get max(): string | null {
    return this.getAttribute('max');
  }

  get step(): string | null {
    return this.getAttribute('step');
  }

  get value1(): string | null {
    return this.getAttribute('value1');
  }

  get value2(): string | null {
    return this.getAttribute('value2');
  }

  get orientation(): Orientation {
    return (this.getAttribute('orientation') as Orientation) || 'horizontal';
  }

  get invert(): boolean {
    return this.getAttribute('invert') === 'true';
  }

  get rulerNumberOfSteps(): string | null {
    return this.getAttribute('ruler-number-of-steps');
  }

  get match(): MatchType {
    return (this.getAttribute('match') as MatchType) || 'any';
  }

  /** Get search type (determines behavior: simple vs advanced mode) */
  get searchType(): SearchType {
    return this._searchType;
  }

  // === Setters ===

  set min(value: string | number) {
    this.setAttribute('min', String(value));
  }

  set max(value: string | number) {
    this.setAttribute('max', String(value));
  }

  set sliderStep(value: string | number) {
    this.setAttribute('slider-step', String(value));
  }

  set inputStep(value: string | number) {
    this.setAttribute('input-step', String(value));
  }

  set value1(value: string | number) {
    this.setAttribute('value1', String(value));
  }

  set value2(value: string | number) {
    this.setAttribute('value2', String(value));
  }

  set orientation(value: Orientation) {
    this.setAttribute('orientation', value);
  }

  set rulerNumberOfSteps(value: string | number) {
    this.setAttribute('ruler-number-of-steps', String(value));
  }

  set match(value: MatchType) {
    this.setAttribute('match', value);
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
    this._searchType = value;
    // Rendering of match radio buttons is handled by `render()` when searchType === 'simple'.
    // Add a delegated listener to the component root so clicks on the radios are handled.
    if (value === 'simple') {
      // setTimeout used to ensure rendered nodes are present
      setTimeout(() => {
        const simpleSearchDiv = this.renderRoot.querySelector('.match');
        if (simpleSearchDiv) {
          simpleSearchDiv.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (target && target.tagName === 'INPUT') {
              this.match = target.value as MatchType;
              this.state.match = target.value as MatchType;
              this._fireEvent(this.state);
            }
          });
        }
      });
    }
  }

  set invert(value: boolean | string) {
    this.setAttribute('invert', String(value));
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
    // Migrate previous connectedCallback behavior into Lit lifecycle
    this._isInitializing = true;

    // Read attributes or use defaults
    this.min = this.getAttribute('min') || '0';
    this.max = this.getAttribute('max') || '1';
    this.value1 = this.getAttribute('value1') || '0';
    this.value2 = this.getAttribute('value2') || '1';
    this.orientation =
      (this.getAttribute('orientation') as Orientation) || 'horizontal';
    this.match = (this.getAttribute('simple-search') as MatchType) || 'any';

    // Setup Proxy-based state (same logic as before)
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
          if (!this._isInitializing) this._fireEvent(target);
          return true;
        } else if (prop === 'invert') {
          if (typeof value === 'boolean') target[prop] = value ? '1' : '0';
          else if (value === '0' || value === '1')
            target[prop] = value as '0' | '1';
          else target[prop] = String(value) === 'true' ? '1' : '0';

          this._getToFromFromState();
          if (!this._isInitializing) this._fireEvent(target);
          return true;
        } else {
          this._getToFromFromState();
          return Reflect.set(target, prop, value, receiver);
        }
      },
    });

    // Initialize state from attributes
    this.state.min = parseFloat(this.min!);
    this.state.max = parseFloat(this.max!);
    this.state.step = parseFloat(this.getAttribute('step') || '0.01');
    this.state.from = Math.min(
      parseFloat(this.value1!),
      parseFloat(this.value2!)
    );
    this.state.to = Math.max(
      parseFloat(this.value1!),
      parseFloat(this.value2!)
    );
    this.state.invert = this.getAttribute('invert') === 'true' ? '1' : '0';
    this.state.match = this.match;

    this.rulerNumberOfSteps = 10;

    // Ensure slider/input attributes (min/max/step) are applied now that DOM is rendered
    if (this.slider1 && this.slider2 && this.from && this.to) {
      const minAttr = this.getAttribute('min') || '0';
      const maxAttr = this.getAttribute('max') || '1';
      const sliderStepAttr =
        this.getAttribute('slider-step') ||
        String(this.state['slider-step'] || 0.01);
      const inputStepAttr =
        this.getAttribute('input-step') ||
        String(this.state['input-step'] || 0.05);

      this.slider1.min = minAttr;
      this.slider2.min = minAttr;
      this.from.min = minAttr;
      this.to.min = minAttr;

      this.slider1.max = maxAttr;
      this.slider2.max = maxAttr;
      this.from.max = maxAttr;
      this.to.max = maxAttr;

      this.slider1.step = sliderStepAttr;
      this.slider2.step = sliderStepAttr;
      this.from.step = inputStepAttr;
      this.to.step = inputStepAttr;
    }

    // Attach listeners to rendered elements
    this.slider1.addEventListener('input', this._slider1Input);
    this.slider2.addEventListener('input', this._slider2Input);
    this.from.addEventListener('change', this._fromChange);
    this.to.addEventListener('change', this._toChange);
    this.invertChk.addEventListener('change', this._invertChange);

    this.from.value = this._formatInputValue(this.state.from);
    this.to.value = this._formatInputValue(this.state.to);

    this._fillSlider();
    this._reRenderRuler();

    this._isInitializing = false;
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
  }
}

// Element is registered via @customElement; export the class for tests/consumers
export default RangeSlider;
