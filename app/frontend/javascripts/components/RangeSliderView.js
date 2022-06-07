const template = document.createElement("template");
const searchTypeSimple = document.createElement("div");
searchTypeSimple.className = "match";
searchTypeSimple.innerHTML = `
<label>
  <input class="all" name="match" type="radio" value="all">
  for all datasets
</label>
<label>
  <input class="any" checked="checked" name="match" type="radio" value="any">
  for any dataset
</label>
`;

template.innerHTML = `
<style data="slider-style">
:host {
    --slider-color: #249EB3;
    --light-gray: #EAEAE9;
}

.wrapper {
    display: flex;
    flex-wrap: wrap;
    gap: 1em;
}

.input {
    margin-right: auto;
    font-size: 10px;
    font-family: 'Roboto', sans-serif;
}

input[type='number'] {
    width: 5em;
    text-align: center;
    line-height: 18px;
    outline: none;
    box-shadow: 0 1px 1px rgb(0 0 0 / 20%) inset;
    border: solid 1px #94928D;
    padding: 0 0 0 8px;
    border-radius: 9px;
    text-align: right;
    font-size: 1em;
}

.meter {
    width: 100%;
    z-index: 1;
    height: 1.5em;
}

.ruler {
    position: relative;
    font-size: 0.8em;
}

.ruler>.scale{
    position: absolute;
    z-index: 10;
    line-height: 1;
    transform: translateY(13px)
}

.scale::before {
    content: "";
    border-left: dotted 1px rgba(0, 0, 0, 0.3);
    height: 14px;
    top: -16px;
    left: 0.5em;
    display: block;
    position: absolute;
}

.meter-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
}

input[type="range"] {
    -webkit-appearance: none;
    line-height: 1em;
    appearance: none;
    width: 100%;
    position: absolute;
    margin: auto;
    background-color: transparent;
    pointer-events: none;
}
  
.slider-track {
    width: calc(100% - 3px);
    height: 8px;
}
  
input[type="range"]::-webkit-slider-runnable-track {
    -webkit-appearance: none;
    height: 8px;
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

input[type="checkbox"] {
  vertical-align: middle; 
}

</style>
<style data="slider-track-style"></style>
<div class="wrapper">

    <div class="input">
        <input class="from" type="number" part="limit-input" title="Lower limit">
    ~
        <input class="to"type="number" part="limit-input" title="Upper limit">
        <label>
            <input class="invert" type="checkbox">Invert range
        </label>
    </div>
    <div class="meter">
      <div class="meter-container">
        <div class="slider-track" id="slider-track" part="slider-track">
          <div class="ruler"></div> 
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
      "min",
      "max",
      "step",
      "value1",
      "value2",
      "orientation",
      "invert",
      "simple-search",
      "ruler-number-of-steps",
    ];
  }

  constructor() {
    super();

    const initState = {
      from: 0,
      to: 1,
      invert: false,
      min: 0,
      max: 1,
      step: 0.05,
      simpleSearch: "any",
      rulerNumberOfSteps: 10,
    };

    this.state = initState;

    this.root = this.getRootNode();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.slider1 = this.shadowRoot.querySelector("#slider-1");
    this.slider2 = this.shadowRoot.querySelector("#slider-2");
    this.sliderTrack = this.shadowRoot.querySelector("#slider-track");
    this.from = this.shadowRoot.querySelector(".from");
    this.to = this.shadowRoot.querySelector(".to");
    this.invertChk = this.shadowRoot.querySelector(".invert");
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "min":
        this.slider1.min = newValue;
        this.slider2.min = newValue;
        this.from.min = newValue;
        this.to.min = newValue;
        break;
      case "max":
        this.slider1.max = newValue;
        this.slider2.max = newValue;
        this.from.max = newValue;
        this.to.max = newValue;
        break;
      case "step":
        this.slider1.step = newValue;
        this.slider2.step = newValue;
        this.from.step = newValue;
        this.to.step = newValue;
        break;
      case "value1":
        this.slider1.value = parseFloat(newValue).toFixed(3);
        break;
      case "value2":
        this.slider2.value = parseFloat(newValue).toFixed(3);
        break;
      case "invert":
        this.invertChk.checked = newValue === "true";
        break;
      case "ruler-number-of-steps":
        this.state.rulerNumberOfSteps = newValue;
        this._reRenderRuler();
        break;
      case "simple-search":
        this.simpleSearch = newValue;
    }

    this._fillSlider();
  }

  _reRenderRuler() {
    const ruler = this.shadowRoot.querySelector(".ruler");
    ruler.innerHTML = "";
    const rulerNumberOfSteps = parseInt(this.state.rulerNumberOfSteps);
    const min = parseFloat(this.state.min);
    const max = parseFloat(this.state.max);
    const step = (max - min) / rulerNumberOfSteps;
    for (let i = 0; i <= rulerNumberOfSteps; i++) {
      const scale = document.createElement("div");
      scale.className = "scale";
      scale.innerText = (min + i * step).toFixed(1);
      scale.style.left = `calc(${(i * 100) / rulerNumberOfSteps}% - 0.5em - ${
        i / rulerNumberOfSteps
      } * 1px)`;
      ruler.appendChild(scale);
    }
  }
  _fillSlider() {
    const val1 = Math.min(this.slider1.value, this.slider2.value);
    const val2 = Math.max(this.slider1.value, this.slider2.value);
    this.from.value = val1;
    this.to.value = val2;

    const percentVal1 = (val1 * 100) / (this.max - this.min);
    const percentVal2 = (val2 * 100) / (this.max - this.min);

    if (!this.invert) {
      this.sliderTrack.style.background = `linear-gradient(90deg, var(--light-gray) 0%, var(--light-gray) ${percentVal1}% , var(--slider-color) ${percentVal1}%,   var(--slider-color) ${percentVal2}%, var(--light-gray) ${percentVal2}%,  var(--light-gray) 100% )`;
    } else {
      this.sliderTrack.style.background = `linear-gradient(90deg, var(--slider-color) 0%, var(--slider-color) ${percentVal1}%, var(--light-gray) ${percentVal1}%,  var(--light-gray) ${percentVal2}%, var(--slider-color) ${percentVal2}%,  var(--slider-color) 100% )`;
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
    return this.getAttribute("min");
  }
  get max() {
    return this.getAttribute("max");
  }
  get step() {
    return this.getAttribute("step");
  }
  get value1() {
    return this.getAttribute("value1");
  }
  get value2() {
    return this.getAttribute("value2");
  }
  get orientation() {
    return this.getAttribute("orientation");
  }
  get invert() {
    return this.getAttribute("invert") === "true";
  }
  get rulerNumberOfSteps() {
    return this.getAttribute("ruler-number-of-steps");
  }

  set min(value) {
    this.setAttribute("min", value);
  }
  set max(value) {
    this.setAttribute("max", value);
  }
  set step(value) {
    this.setAttribute("step", value);
  }
  set value1(value) {
    this.setAttribute("value1", value);
  }
  set value2(value) {
    this.setAttribute("value2", value);
  }
  set orientation(value) {
    this.setAttribute("orientation", value);
  }
  set rulerNumberOfSteps(value) {
    this.setAttribute("ruler-number-of-steps", value);
  }
  set searchType(value) {
    // do not expose this to the user
    if (value === "simple") {
      this.shadowRoot
        .querySelector(".wrapper")
        .appendChild(searchTypeSimple.cloneNode(true));
      this.simpleSearchDiv = this.shadowRoot.querySelector(".match");
      this.simpleSearchDiv.addEventListener("click", (e) => {
        if (e.target.tagName === "INPUT") {
          this.simpleSearch = e.target.value;
          this.state.simpleSearch = e.target.value;
          this._fireEvent(this.state);
        }
      });
    }
  }

  set invert(value) {
    this.setAttribute("invert", value);
  }

  _fireEvent(detail) {
    const event = new CustomEvent("range-changed", {
      bubbles: true,
      detail: detail,
    });
    console.log(detail);
    this.dispatchEvent(event);
  }

  connectedCallback() {
    this.min = this.getAttribute("min") || 0;
    this.max = this.getAttribute("max") || 1;
    this.step = this.getAttribute("step") || 0.05;
    this.value1 = this.getAttribute("value1") || 0;
    this.value2 = this.getAttribute("value2") || 1;
    this.orientation = this.getAttribute("orientation") || "horizontal";

    this.invert = this.getAttribute("invert") === "true";
    this.simpleSearch = this.getAttribute("simple-search") || "any";

    this.state.min = this.min;
    this.state.max = this.max;
    this.state.step = this.step;
    this.state.from = Math.min(+this.value1, +this.value2);
    this.state.to = Math.max(+this.value1, +this.value2);
    this.state.invert = this.invert;
    this.state.simpleSearch = this.simpleSearch;

    this.rulerNumberOfSteps = 10;

    this.slider1.addEventListener("input", (e) => {
      this.value1 = +e.target.value;
      this.state.from = Math.min(+this.slider1.value, +this.slider2.value);
      this.state.to = Math.max(+this.slider1.value, +this.slider2.value);

      this._fillSlider.call(this);
    });

    this.slider1.addEventListener("mouseup", (e) => {
      this._fireEvent(this.state);
    });

    this.slider2.addEventListener("input", (e) => {
      this.value2 = +e.target.value;

      this.state.from = Math.min(+this.slider1.value, +this.slider2.value);
      this.state.to = Math.max(+this.slider1.value, +this.slider2.value);

      this._fillSlider.call(this);
    });
    this.slider2.addEventListener("mouseup", (e) => {
      this._fireEvent(this.state);
    });

    this.from.addEventListener("input", (e) => {
      const slider1Val = +this.slider1.value;
      const slider2Val = +this.slider2.value;

      if (slider1Val < slider2Val) {
        this.slider1.value = +e.target.value;
      } else {
        this.slider2.value = +e.target.value;
      }

      this.state.from = Math.min(+this.slider1.value, +this.slider2.value);
      this.state.to = Math.max(+this.slider1.value, +this.slider2.value);
      this._fillSlider.call(this);
    });

    this.from.addEventListener("change", () => {
      this._fireEvent(this.state);
    });

    this.to.addEventListener("input", (e) => {
      const slider1Val = +this.slider1.value;
      const slider2Val = +this.slider2.value;
      if (slider2Val > slider1Val) {
        this.slider2.value = +e.target.value;
      } else {
        this.slider1.value = +e.target.value;
      }
      this.state.from = Math.min(+this.slider1.value, +this.slider2.value);
      this.state.to = Math.max(+this.slider1.value, +this.slider2.value);

      this._fillSlider.call(this);
    });

    this.to.addEventListener("change", () => {
      this._fireEvent(this.state);
    });

    this.invertChk.addEventListener("change", (e) => {
      this.invert = e.target.checked;
      this.state.invert = e.target.checked;
      this._fireEvent(this.state);
    });

    this._fillSlider();
    this._reRenderRuler();
  }

  disconnectedCallback() {
    this.slider1.removeEventListener("input");
    this.slider2.removeEventListener("input");
    this.from.removeEventListener("input");
    this.to.removeEventListener("input");
    this.invertChk.removeEventListener("change");
  }
}

customElements.define("range-slider", RangeSlider);
