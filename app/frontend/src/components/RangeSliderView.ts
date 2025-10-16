// Type definitions
type SearchType = 'simple' | 'advanced' | null;
type Orientation = 'horizontal' | 'vertical';
type MatchType = 'all' | 'any';

interface RangeSliderState {
  from: number;
  to: number;
  invert: '0' | '1';
  min: number;
  max: number;
  'input-step': number;
  'slider-step': number;
  step?: number;
  match: MatchType;
  rulerNumberOfSteps: number;
}

interface RangeChangedEventDetail {
  from: number;
  to: number;
  match?: MatchType;
  invert: '0' | '1';
}

// Template elements
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

class RangeSlider extends HTMLElement {
  // State management
  public state: RangeSliderState;
  private _searchType: SearchType;
  private _isInitializing: boolean;

  // Shadow DOM elements
  private root: Node;
  private slider1!: HTMLInputElement;
  private slider2!: HTMLInputElement;
  private sliderTrack!: HTMLDivElement;
  private from!: HTMLInputElement;
  private to!: HTMLInputElement;
  private invertChk!: HTMLInputElement;
  private _meter!: HTMLDivElement;

  static get observedAttributes(): string[] {
    return [
      'min',
      'max',
      'input-step',
      'slider-step',
      'value1',
      'value2',
      'orientation',
      'invert',
      'match',
      'ruler-number-of-steps',
    ];
  }

  constructor() {
    super();

    const initState: RangeSliderState = {
      from: 0,
      to: 1,
      invert: '0',
      min: 0,
      max: 1,
      'input-step': 0.05,
      'slider-step': 0.01,
      match: 'any',
      rulerNumberOfSteps: 10,
    };

    this.state = initState;
    this._searchType = null;
    this._isInitializing = true;

    this.root = this.getRootNode();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));

    this._initializeElements();
  }

  private _initializeElements(): void {
    this.slider1 = this.shadowRoot!.querySelector('#slider-1')!;
    this.slider2 = this.shadowRoot!.querySelector('#slider-2')!;
    this.sliderTrack = this.shadowRoot!.querySelector('#slider-track')!;
    this.from = this.shadowRoot!.querySelector('.from')!;
    this.to = this.shadowRoot!.querySelector('.to')!;
    this.invertChk = this.shadowRoot!.querySelector('.invert')!;
    this._meter = this.shadowRoot!.querySelector('.meter')!;
  }

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
        if (this._isInitializing) {
          this.slider1.value = parseFloat(newValue).toFixed(3);
        }
        if (this.state && this._isInitializing) {
          const parsedValue = parseFloat(newValue);
          this.state.from = Math.min(parsedValue, this.state.to);
        }
        break;
      case 'value2':
        if (this._isInitializing) {
          this.slider2.value = parseFloat(newValue).toFixed(3);
        }
        if (this.state && this._isInitializing) {
          const parsedValue = parseFloat(newValue);
          this.state.to = Math.max(parsedValue, this.state.from);
        }
        break;
      case 'invert':
        if (this._isInitializing) {
          this.invertChk.checked = newValue === 'true';
        }
        if (this.state && this._isInitializing) {
          this.state.invert = newValue === 'true' ? '1' : '0';
        }
        break;
      case 'ruler-number-of-steps':
        this.state.rulerNumberOfSteps = parseInt(newValue, 10);
        this._reRenderRuler();
        break;
      case 'match':
        // Don't call setter to avoid infinite loop
        // The attribute is already set, just update state if needed
        if (this.state) {
          this.state.match = newValue as MatchType;
        }
        break;
      case 'orientation':
        if (newValue === 'vertical') {
          this._meter.classList.add('-vertical');
        } else {
          this._meter.classList.remove('-vertical');
        }
        this._reRenderRuler();
        break;
    }

    this._fillSlider();
  }

  private _reRenderRuler(): void {
    const ruler = this.shadowRoot!.querySelector('.ruler')!;
    ruler.innerHTML = '';
    const rulerNumberOfSteps = this.state.rulerNumberOfSteps;
    const min = this.state.min;
    const max = this.state.max;
    const step = (max - min) / rulerNumberOfSteps;

    for (let i = 0; i <= rulerNumberOfSteps; i++) {
      const scale = document.createElement('div');
      scale.className = 'scale';
      scale.part.add('scale');
      scale.part.add(`scale-${this.orientation}`);
      scale.innerText = (min + i * step).toFixed(1);
      scale.style.left = `calc(${(i * 100) / rulerNumberOfSteps}% - 0.5em`;
      ruler.appendChild(scale);
    }
  }

  private _fillSlider(): void {
    const val1 = Math.min(
      parseFloat(this.slider1.value),
      parseFloat(this.slider2.value)
    );
    const val2 = Math.max(
      parseFloat(this.slider1.value),
      parseFloat(this.slider2.value)
    );

    const percentVal1 =
      (val1 * 100) / (parseFloat(this.max!) - parseFloat(this.min!));
    const percentVal2 =
      (val2 * 100) / (parseFloat(this.max!) - parseFloat(this.min!));

    if (this.state.invert !== '1') {
      this.sliderTrack.style.background = `linear-gradient(90deg, var(--color-light-gray) 0%, var(--color-light-gray) ${percentVal1}% , var(--color-key-dark1) ${percentVal1}%,   var(--color-key-dark1) ${percentVal2}%, var(--color-light-gray) ${percentVal2}%,  var(--color-light-gray) 100% )`;
    } else {
      this.sliderTrack.style.background = `linear-gradient(90deg, var(--color-key-dark1) 0%, var(--color-key-dark1) ${percentVal1}%, var(--color-light-gray) ${percentVal1}%,  var(--color-light-gray) ${percentVal2}%, var(--color-key-dark1) ${percentVal2}%,  var(--color-key-dark1) 100% )`;
    }

    this._drawThumbs();
  }

  private _drawThumbs(): void {
    const styleElement = this.shadowRoot!.querySelector(
      "style[data='slider-track-style']"
    )!;

    if (parseFloat(this.slider1.value) < parseFloat(this.slider2.value)) {
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

  // Getters
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

  get searchType(): SearchType {
    return this._searchType;
  }

  // Setters
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

  set searchType(value: SearchType) {
    this._searchType = value;

    if (value === 'simple') {
      this.shadowRoot!.querySelector('.wrapper')!.appendChild(searchTypeSimple);
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

  private _fireEvent(detail: RangeSliderState): void {
    const eventKeys: Array<keyof RangeChangedEventDetail> = [
      'from',
      'to',
      'match',
      'invert',
    ];

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

  connectedCallback(): void {
    this._isInitializing = true;

    this.min = this.getAttribute('min') || '0';
    this.max = this.getAttribute('max') || '1';
    this.value1 = this.getAttribute('value1') || '0';
    this.value2 = this.getAttribute('value2') || '1';
    this.orientation =
      (this.getAttribute('orientation') as Orientation) || 'horizontal';
    this.match = (this.getAttribute('simple-search') as MatchType) || 'any';

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
            if (parsedValue < 0) {
              return true;
            }

            if (prop === 'from') {
              if (parsedValue > target.to) {
                target.to = parsedValue;
              } else {
                target.from = parsedValue;
              }
            } else {
              if (parsedValue < target.from) {
                target.from = parsedValue;
              } else {
                target.to = parsedValue;
              }
            }
          }

          this._getToFromFromState();
          if (!this._isInitializing) {
            this._fireEvent(target);
          }
          return true;
        } else if (prop === 'invert') {
          if (typeof value === 'boolean') {
            target[prop] = value ? '1' : '0';
          } else if (value === '0' || value === '1') {
            target[prop] = value;
          } else {
            target[prop] = String(value) === 'true' ? '1' : '0';
          }

          this._getToFromFromState();
          if (!this._isInitializing) {
            this._fireEvent(target);
          }
          return true;
        } else {
          this._getToFromFromState();
          return Reflect.set(target, prop, value, receiver);
        }
      },
    });

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

  private _slider1Input = (e: Event): void => {
    this.state.from = parseFloat((e.target as HTMLInputElement).value);
  };

  private _slider2Input = (e: Event): void => {
    this.state.to = parseFloat((e.target as HTMLInputElement).value);
  };

  private _getToFromFromState(): void {
    this.slider1.value = String(Math.min(this.state.from, this.state.to));
    this.slider2.value = String(Math.max(this.state.to, this.state.to));

    this.from.value = this._formatInputValue(this.state.from);
    this.to.value = this._formatInputValue(this.state.to);

    this._fillSlider();
  }

  /**
   * Formats a numeric value for display in input fields
   * Ensures at least 1 decimal place is shown (e.g., 0.0, 1.0)
   */
  private _formatInputValue(value: number | string): string {
    const num = parseFloat(String(value));
    if (isNaN(num)) return String(value);

    const str = num.toString();
    const decimalIndex = str.indexOf('.');
    const currentDecimals =
      decimalIndex === -1 ? 0 : str.length - decimalIndex - 1;
    const decimals = Math.max(1, currentDecimals);

    return num.toFixed(decimals);
  }

  private _toChange = (e: Event): void => {
    this.state.to = parseFloat((e.target as HTMLInputElement).value);
  };

  private _fromChange = (e: Event): void => {
    this.state.from = parseFloat((e.target as HTMLInputElement).value);
  };

  private _invertChange = (e: Event): void => {
    this.state.invert = (e.target as HTMLInputElement).checked ? '1' : '0';
  };

  disconnectedCallback(): void {
    this.slider1.removeEventListener('input', this._slider1Input);
    this.slider2.removeEventListener('input', this._slider2Input);
    this.from.removeEventListener('change', this._fromChange);
    this.to.removeEventListener('change', this._toChange);
    this.invertChk.removeEventListener('change', this._invertChange);
  }
}

customElements.define('range-slider', RangeSlider);

export default RangeSlider;
