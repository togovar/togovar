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

// Simple search template: Match type selector (all/any datasets)
const template = document.createElement('template');
const searchTypeSimple = document.createElement('div');
searchTypeSimple.className = 'match';
searchTypeSimple.part = 'match';
searchTypeSimple.innerHTML = `
<label part="match label">
  <input class="all" name="match" type="radio" value="all">
  for all datasets
</label>
<label part="label">
  <input class="any" checked="checked" name="match" type="radio" value="any">
  for any dataset
</label>
`;

// Main slider template: Numeric inputs + visual slider + ruler
template.innerHTML = `
<style data="slider-style">
input[type="range"]::-webkit-slider-runnable-track {
    -webkit-appearance: none;
    height: 8px;
}

.-vertical {
  transform: rotate(-90deg);
}

input[type="range"]::-webkit-slider-thumb {
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
<style data="slider-track-style"></style>
<div class="wrapper" part="wrapper">

    <div class="input" part="div-input">
        <input class="from"  part="num-input" type="number" part="limit-input" title="Lower limit">
    ~
        <input class="to"  part="num-input" type="number" part="limit-input" title="Upper limit">
        <label part="checkbox-label label">
            <input class="invert" type="checkbox" part="checkbox">Invert range
        </label>
    </div>
    <div class="meter" part="meter">
      <div class="meter-container" part="meter-container">
        <div class="slider-track" id="slider-track" part="slider-track">
          <div class="ruler" part="ruler"></div>
        </div>
        <input
            part = "slider"
            type="range"
            name="slider-1"
            id="slider-1"
        />
        <input
            part = "slider"
            type="range"
            name="slider-2"
            id="slider-2"
        />
      </div>
    </div>
</div>
`;

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
class RangeSlider extends HTMLElement {
  // === State Management ===
  /** Reactive state object (wrapped in Proxy for change detection) */
  public state: RangeSliderState;

  /** Search type context: 'simple' enables match radio buttons and 0-1 range restriction */
  private _searchType: SearchType;

  /** Flag to prevent event firing during component initialization */
  private _isInitializing: boolean;

  // === Shadow DOM Elements ===
  /** Root node reference (Document or ShadowRoot) */
  private root: Node;

  /** Left/lower range slider (HTML input type="range") */
  private slider1!: HTMLInputElement;

  /** Right/upper range slider (HTML input type="range") */
  private slider2!: HTMLInputElement;

  /** Visual slider track with gradient background */
  private sliderTrack!: HTMLDivElement;

  /** Lower bound numeric input field */
  private from!: HTMLInputElement;

  /** Upper bound numeric input field */
  private to!: HTMLInputElement;

  /** "Invert range" checkbox */
  private invertChk!: HTMLInputElement;

  /** Meter container (for vertical orientation support) */
  private _meter!: HTMLDivElement;

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
    this.root = this.getRootNode();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));

    // Query and store DOM element references
    this._initializeElements();
  }

  /**
   * Query and cache references to Shadow DOM elements
   * Called once during construction to avoid repeated queries
   */
  private _initializeElements(): void {
    this.slider1 = this.shadowRoot!.querySelector('#slider-1')!;
    this.slider2 = this.shadowRoot!.querySelector('#slider-2')!;
    this.sliderTrack = this.shadowRoot!.querySelector('#slider-track')!;
    this.from = this.shadowRoot!.querySelector('.from')!;
    this.to = this.shadowRoot!.querySelector('.to')!;
    this.invertChk = this.shadowRoot!.querySelector('.invert')!;
    this._meter = this.shadowRoot!.querySelector('.meter')!;
  }

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

    switch (name) {
      case 'min':
        this.slider1.min = newValue;
        this.slider2.min = newValue;
        this.from.min = newValue;
        this.to.min = newValue;
        break;
      case 'max':
        this.slider1.max = newValue;
        this.slider2.max = newValue;
        this.from.max = newValue;
        this.to.max = newValue;
        break;
      case 'slider-step':
        this.slider1.step = newValue;
        this.slider2.step = newValue;
        break;
      case 'input-step':
        this.from.step = newValue;
        this.to.step = newValue;
        break;
      case 'value1':
        // Update slider position during initialization only
        if (this._isInitializing) {
          this.slider1.value = parseFloat(newValue).toFixed(3);
        }
        // Update state (ensures from <= to)
        if (this.state && this._isInitializing) {
          const parsedValue = parseFloat(newValue);
          this.state.from = Math.min(parsedValue, this.state.to);
        }
        break;

      case 'value2':
        // Update slider position during initialization only
        if (this._isInitializing) {
          this.slider2.value = parseFloat(newValue).toFixed(3);
        }
        // Update state (ensures to >= from)
        if (this.state && this._isInitializing) {
          const parsedValue = parseFloat(newValue);
          this.state.to = Math.max(parsedValue, this.state.from);
        }
        break;

      case 'invert':
        // Update checkbox during initialization only
        if (this._isInitializing) {
          this.invertChk.checked = newValue === 'true';
        }
        // Update state (convert boolean to '0'/'1')
        if (this.state && this._isInitializing) {
          this.state.invert = newValue === 'true' ? '1' : '0';
        }
        break;

      case 'ruler-number-of-steps':
        // Number of scale marks on ruler
        this.state.rulerNumberOfSteps = parseInt(newValue, 10);
        this._reRenderRuler();
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
        if (newValue === 'vertical') {
          this._meter.classList.add('-vertical');
        } else {
          this._meter.classList.remove('-vertical');
        }
        this._reRenderRuler(); // Reposition scale marks
        break;
    }

    // Update visual slider track after any attribute change
    this._fillSlider();
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

    if (value === 'simple') {
      // Append match type selector to wrapper
      this.shadowRoot!.querySelector('.wrapper')!.appendChild(searchTypeSimple);

      // Listen for match type changes
      const simpleSearchDiv = this.shadowRoot!.querySelector('.match')!;
      simpleSearchDiv.addEventListener('click', (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (target.tagName === 'INPUT') {
          this.match = target.value as MatchType;
          this.state.match = target.value as MatchType;
          this._fireEvent(this.state);
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

  /**
   * Custom Element lifecycle - called when element is added to DOM
   *
   * Responsibilities:
   * 1. Initialize attributes from HTML or defaults
   * 2. Setup Proxy-based state management with validation
   * 3. Attach event listeners to sliders, inputs, checkbox
   * 4. Render initial visual state (ruler, gradient, thumbs)
   * 5. Enable event firing after initialization completes
   */
  connectedCallback(): void {
    // Start initialization mode (prevents events during setup)
    this._isInitializing = true;

    // Read attributes or use defaults
    this.min = this.getAttribute('min') || '0';
    this.max = this.getAttribute('max') || '1';
    this.value1 = this.getAttribute('value1') || '0';
    this.value2 = this.getAttribute('value2') || '1';
    this.orientation =
      (this.getAttribute('orientation') as Orientation) || 'horizontal';
    this.match = (this.getAttribute('simple-search') as MatchType) || 'any';

    /**
     * Wrap state in Proxy for reactive updates
     *
     * This Proxy intercepts property assignments and:
     * 1. Validates values (range checks, type conversions)
     * 2. Maintains from <= to constraint
     * 3. Updates UI elements (sliders, inputs, gradient)
     * 4. Dispatches 'range-changed' events (after initialization)
     *
     * Proxy handlers:
     * - 'from'/'to': Numeric validation, range enforcement, cross-constraint
     * - 'invert': Boolean to '0'/'1' conversion
     * - Other props: Standard reflection
     */
    this.state = new Proxy(this.state, {
      set: (
        target: RangeSliderState,
        prop: string | symbol,
        value: unknown,
        receiver: RangeSliderState
      ): boolean => {
        // === Handle 'from' and 'to' value changes ===
        if (prop === 'from' || prop === 'to') {
          const valueStr = String(value);
          if (isNaN(parseFloat(valueStr))) return true; // Ignore invalid numbers

          const parsedValue = parseFloat(valueStr);
          const isSimpleSearch = this.searchType === 'simple';

          // Simple search: Enforce 0-1 range (frequency mode)
          if (isSimpleSearch && (parsedValue > 1 || parsedValue < 0)) {
            if (parsedValue > 1) {
              target.to = 1;
            }
            if (parsedValue < 0) {
              target.from = 0;
            }
          } else {
            // Advanced search: Allow values > 1, but reject negatives
            if (parsedValue < 0) {
              return true; // Ignore negative values
            }

            // Maintain from <= to constraint
            if (prop === 'from') {
              if (parsedValue > target.to) {
                target.to = parsedValue; // Adjust 'to' upward
              } else {
                target.from = parsedValue;
              }
            } else {
              // prop === 'to'
              if (parsedValue < target.from) {
                target.from = parsedValue; // Adjust 'from' downward
              } else {
                target.to = parsedValue;
              }
            }
          }

          this._getToFromFromState(); // Sync UI elements
          if (!this._isInitializing) {
            this._fireEvent(target); // Notify parent components
          }
          return true;
        }
        // === Handle 'invert' boolean changes ===
        else if (prop === 'invert') {
          // Convert various input types to '0' or '1'
          if (typeof value === 'boolean') {
            target[prop] = value ? '1' : '0';
          } else if (value === '0' || value === '1') {
            target[prop] = value;
          } else {
            target[prop] = String(value) === 'true' ? '1' : '0';
          }

          this._getToFromFromState(); // Update gradient for inverted mode
          if (!this._isInitializing) {
            this._fireEvent(target);
          }
          return true;
        }
        // === Handle other properties ===
        else {
          this._getToFromFromState();
          return Reflect.set(target, prop, value, receiver);
        }
      },
    });

    // Initialize state from attributes
    this.state.min = parseFloat(this.min!);
    this.state.max = parseFloat(this.max!);
    this.state.step = parseFloat(this.getAttribute('step') || '0.01');

    // Ensure from <= to
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

    // Setup ruler with 10 scale marks
    this.rulerNumberOfSteps = 10;

    // === Attach Event Listeners ===
    // Slider drag events -> update state
    this.slider1.addEventListener('input', this._slider1Input);
    this.slider2.addEventListener('input', this._slider2Input);

    // Number input changes -> update state
    this.from.addEventListener('change', this._fromChange);
    this.to.addEventListener('change', this._toChange);

    // Invert checkbox -> update state
    this.invertChk.addEventListener('change', this._invertChange);

    // Set initial formatted values in input fields
    this.from.value = this._formatInputValue(this.state.from);
    this.to.value = this._formatInputValue(this.state.to);

    // Render initial visual state
    this._fillSlider(); // Gradient track
    this._reRenderRuler(); // Scale marks

    // Initialization complete - enable event firing
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

// Register custom element in the browser's CustomElementRegistry
customElements.define('range-slider', RangeSlider);

export default RangeSlider;
