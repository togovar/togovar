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
  static get observedAttributes() {
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

    const initState = {
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

    this.root = this.getRootNode();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.slider1 = this.shadowRoot.querySelector('#slider-1');
    this.slider2 = this.shadowRoot.querySelector('#slider-2');
    this.sliderTrack = this.shadowRoot.querySelector('#slider-track');
    this.from = this.shadowRoot.querySelector('.from');
    this.to = this.shadowRoot.querySelector('.to');
    this.invertChk = this.shadowRoot.querySelector('.invert');
    this._meter = this.shadowRoot.querySelector('.meter');
  }

  attributeChangedCallback(name, oldValue, newValue) {
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
        this.slider1.value = parseFloat(newValue).toFixed(3);
        break;
      case 'value2':
        this.slider2.value = parseFloat(newValue).toFixed(3);
        break;
      case 'invert':
        this.invertChk.checked = newValue === 'true';
        break;
      case 'ruler-number-of-steps':
        this.state.rulerNumberOfSteps = newValue;
        this._reRenderRuler();
        break;
      case 'match':
        this.match = newValue;
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

  _reRenderRuler() {
    const ruler = this.shadowRoot.querySelector('.ruler');
    ruler.innerHTML = '';
    const rulerNumberOfSteps = parseInt(this.state.rulerNumberOfSteps);
    const min = parseFloat(this.state.min);
    const max = parseFloat(this.state.max);
    const step = (max - min) / rulerNumberOfSteps;
    for (let i = 0; i <= rulerNumberOfSteps; i++) {
      const scale = document.createElement('div');
      scale.className = 'scale';
      scale.part = 'scale';
      scale.part.add(`scale-${this.orientation}`);
      scale.innerText = (min + i * step).toFixed(1);
      scale.style.left = `calc(${(i * 100) / rulerNumberOfSteps}% - 0.5em`;
      ruler.appendChild(scale);
    }
  }
  _fillSlider() {
    const val1 = Math.min(this.slider1.value, this.slider2.value);
    const val2 = Math.max(this.slider1.value, this.slider2.value);

    const percentVal1 = (val1 * 100) / (this.max - this.min);
    const percentVal2 = (val2 * 100) / (this.max - this.min);

    if (this.state.invert !== '1') {
      this.sliderTrack.style.background = `linear-gradient(90deg, var(--color-light-gray) 0%, var(--color-light-gray) ${percentVal1}% , var(--color-key-dark1) ${percentVal1}%,   var(--color-key-dark1) ${percentVal2}%, var(--color-light-gray) ${percentVal2}%,  var(--color-light-gray) 100% )`;
    } else {
      this.sliderTrack.style.background = `linear-gradient(90deg, var(--color-key-dark1) 0%, var(--color-key-dark1) ${percentVal1}%, var(--color-light-gray) ${percentVal1}%,  var(--color-light-gray) ${percentVal2}%, var(--color-key-dark1) ${percentVal2}%,  var(--color-key-dark1) 100% )`;
    }

    this._drawThumbs();
  }

  _drawThumbs() {
    if (+this.slider1.value < +this.slider2.value) {
      this.shadowRoot.querySelector(
        "style[data='slider-track-style']"
      ).innerHTML = `#slider-1::-webkit-slider-thumb {
            border-right: 1px solid rgba(0, 0, 0, 0.5);
            transform: translateX(-1.5px);
        }
        #slider-2::-webkit-slider-thumb {
            border-left: 1px solid rgba(0, 0, 0, 0.5);
            transform: translateX(1.5px)
        }
        `;
    } else {
      this.shadowRoot.querySelector(
        "style[data='slider-track-style']"
      ).innerHTML = `#slider-2::-webkit-slider-thumb {
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

  get min() {
    return this.getAttribute('min');
  }
  get max() {
    return this.getAttribute('max');
  }
  get step() {
    return this.getAttribute('step');
  }
  get value1() {
    return this.getAttribute('value1');
  }
  get value2() {
    return this.getAttribute('value2');
  }
  get orientation() {
    return this.getAttribute('orientation');
  }
  get invert() {
    return this.getAttribute('invert') === 'true';
  }
  get rulerNumberOfSteps() {
    return this.getAttribute('ruler-number-of-steps');
  }
  set min(value) {
    this.setAttribute('min', value);
  }
  set max(value) {
    this.setAttribute('max', value);
  }
  set sliderStep(value) {
    this.setAttribute('slider-step', value);
  }
  set inputStep(value) {
    this.setAttribute('input-step', value);
  }
  set value1(value) {
    this.setAttribute('value1', value);
  }
  set value2(value) {
    this.setAttribute('value2', value);
  }
  set orientation(value) {
    this.setAttribute('orientation', value);
  }
  set rulerNumberOfSteps(value) {
    this.setAttribute('ruler-number-of-steps', value);
  }
  set searchType(value) {
    // do not expose this to the user
    if (value === 'simple') {
      this.shadowRoot.querySelector('.wrapper').appendChild(searchTypeSimple);
      const simpleSearchDiv = this.shadowRoot.querySelector('.match');
      simpleSearchDiv.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT') {
          this.match = e.target.value;
          this.state.match = e.target.value;
          this._fireEvent(this.state);
        }
      });
    }
  }

  set invert(value) {
    this.setAttribute('invert', value);
  }

  _fireEvent(detail) {
    const eventKeys = ['from', 'to', 'match', 'invert'];

    const eventData = Object.fromEntries(
      Object.entries(detail).filter((key) => eventKeys.includes(key[0]))
    );
    const event = new CustomEvent('range-changed', {
      bubbles: true,
      detail: eventData,
    });

    this.dispatchEvent(event);
  }

  connectedCallback() {
    this.min = this.getAttribute('min') || 0;
    this.max = this.getAttribute('max') || 1;
    this.step = this.getAttribute('step') || 0.01;
    this.value1 = this.getAttribute('value1') || 0;
    this.value2 = this.getAttribute('value2') || 1;
    this.orientation = this.getAttribute('orientation') || 'horizontal';

    this.match = this.getAttribute('simple-search') || 'any';

    this.state = new Proxy(this.state, {
      set: (target, prop, value, receiver) => {
        if (prop === 'from' || prop === 'to') {
          if (isNaN(parseFloat(value))) return true;

          const parsedValue = parseFloat(value);

          if (parsedValue > 1 || parsedValue < 0) {
            if (parsedValue > 1) {
              target.to = 1;
            }
            if (parsedValue < 0) {
              target.from = 0;
            }
          } else {
            if (prop === 'from') {
              // if from is larger than to, set to instead
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

          this._getToFromFromState.call(this);
          this._fireEvent(target);
          return true;
        } else if (prop === 'invert') {
          if (typeof value === 'boolean') {
            target[prop] = value ? '1' : '0';
          } else {
            target[prop] = value;
          }

          this._getToFromFromState.call(this);

          this._fireEvent(target);
          return true;
        } else {
          this._getToFromFromState.call(this);
          return Reflect.set(target, prop, value, receiver);
        }
      },
    });

    this.state.min = this.min;
    this.state.max = this.max;
    this.state.from = Math.min(+this.value1, +this.value2);
    this.state.to = Math.max(+this.value1, +this.value2);
    this.state.invert = this.getAttribute('invert') === 'true';
    this.state.match = this.match;

    this.rulerNumberOfSteps = 10;

    this.slider1.addEventListener('input', this._slider1Input);

    this.slider2.addEventListener('input', this._slider2Input);

    this.from.addEventListener('change', this._fromChange);

    this.to.addEventListener('change', this._toChange);

    this.invertChk.addEventListener('change', this._invertChange);

    this._fillSlider();
    this._reRenderRuler();
  }

  _slider1Input = (e) => {
    this.state.from = e.target.value;
  };
  _slider2Input = (e) => {
    this.state.to = e.target.value;
  };

  _getToFromFromState() {
    this.slider1.value = Math.min(this.state.from, this.state.to);
    this.slider2.value = Math.max(this.state.to, this.state.to);

    this.from.value = this.state.from;
    this.to.value = this.state.to;

    this._fillSlider.call(this);
  }

  _toChange = (e) => {
    this.state.to = e.target.value;
  };

  _fromChange = (e) => {
    this.state.from = e.target.value;
  };

  _invertChange = (e) => {
    this.state.invert = e.target.checked;
  };

  disconnectedCallback() {
    this.slider1.removeEventListener('input', this._slider1Input);
    this.slider2.removeEventListener('input', this._slider2Input);
    this.from.removeEventListener('change', this._fromChange);
    this.to.removeEventListener('cnahge', this._toChange);
    this.invertChk.removeEventListener('change', this._invertChange);
  }
}

customElements.define('range-slider', RangeSlider);
