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
.wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 1rem;
}
.input {
    margin-right: auto;
}

input[type='number'] {
    width: 2.5rem;
    border-radius: 1rem;
    text-align: center;
}

.meter {
    width: 100%;
}

.meter-container {
    display: flex;
    flex-direction: column;
    align-content: center;
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
    width: calc(100% - 0.3em);
    height: 5px;
    border-radius: 5px;
    background: linear-gradient(
      90deg,
      rgb(200, 200, 200) 0%,
      rgb(200, 200, 200) 20%,
      rgb(0, 20, 200) 20%,
      rgb(0, 20, 200) 50%,
      rgb(200, 200, 200) 50%,
      rgb(200, 200, 200) 100%
    );
  }
  
  input[type="range"]::-webkit-slider-runnable-track {
    -webkit-appearance: none;
    height: 5px;
  }
  
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: 1.7em;
    width: 0.3em;
    background-color: transparent;
    border-top: solid 1px rgba(0, 0, 0, 0.5);
    border-bottom: solid 1px rgba(0, 0, 0, 0.5);
    cursor: col-resize;
    pointer-events: auto;
    margin-top: -9px;
  }
  
  input[type="range"]:active::-webkit-slider-thumb {
    background-color: #fff;
    border: 3px solid #3264fe;
  }

</style>
<style data="slider-track-style"></style>
<div class="wrapper">

<div class="input">
    <input class="from" type="number"  title="Lower limit">
~
    <input class="to"type="number" title="Upper limit">
    <label>
        <input class="invert" type="checkbox">Invert range
    </label>
</div>
<div class="meter">
    <div class="meter-container">
        <div class="slider-track" id="slider-track"></div>
        <input
            type="range"
            name="slider-1"
            id="slider-1"

        />
        <input
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
      "search-type",
      "invert",
      "simple-search",
    ];
  }

  constructor() {
    super();

    const initState = {
      from: 0,
      to: 1,
      searchType: "simple",
      invert: false,
      min: 0,
      max: 1,
      step: 0.05,
      simpleSearch: "any",
    };
    this.state = initState;

    this.root = this.getRootNode();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.shadowRoot.appendChild(searchTypeSimple.cloneNode(true));

    this.slider1 = this.shadowRoot.querySelector("#slider-1");
    this.slider2 = this.shadowRoot.querySelector("#slider-2");
    this.sliderTrack = this.shadowRoot.querySelector("#slider-track");
    this.from = this.shadowRoot.querySelector(".from");
    this.to = this.shadowRoot.querySelector(".to");
    this.invertChk = this.shadowRoot.querySelector(".invert");
    this.simpleSearchDiv = this.shadowRoot.querySelector(".match");
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "min":
        this.slider1.min = newValue;
        this.slider2.min = newValue;
        this.from.max = newValue;
        this.to.max = newValue;
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
        this.slider1.value = newValue;
        break;
      case "value2":
        this.slider2.value = newValue;
        break;
      case "invert":
        this.invertChk.checked = newValue === "true";
        break;
      case "search-type":
        if (newValue === "simple") {
          this.simpleSearchDiv.style.display = "block";
        } else {
          this.simpleSearchDiv.style.display = "none";
        }

      case "simple-search":
        this.simpleSearch = newValue;
    }

    this._fillSlider();
  }

  _fillSlider() {
    const val1 = Math.min(this.slider1.value, this.slider2.value);
    const val2 = Math.max(this.slider1.value, this.slider2.value);
    this.from.value = val1;
    this.to.value = val2;

    const percentVal1 = (val1 * 100) / (this.max - this.min);
    const percentVal2 = (val2 * 100) / (this.max - this.min);

    if (!this.invert) {
      this.sliderTrack.style.background = `linear-gradient(90deg, rgb(200, 200, 200) 0%, rgb(200, 200, 200) calc(${percentVal1}% + 2px), rgb(0,20,200) ${percentVal1}%,   rgb(0,20,200) ${percentVal2}%, rgb(200, 200, 200) ${percentVal2}%,  rgb(200, 200, 200) 100% )`;
    } else {
      this.sliderTrack.style.background = `linear-gradient(90deg, rgb(0,20,200) 0%, rgb(0,20,200) calc(${percentVal1}% + 2px), rgb(200, 200, 200) ${percentVal1}%,  rgb(200, 200, 200) ${percentVal2}%, rgb(0,20,200) ${percentVal2}%,  rgb(0,20,200) 100% )`;
    }

    this._drawThumbs();
  }

  _drawThumbs() {
    if (+this.slider1.value < +this.slider2.value) {
      this.shadowRoot.querySelector(
        "style[data='slider-track-style']"
      ).innerHTML = `#slider-1::-webkit-slider-thumb {
            border-right: 1px solid rgba(0, 0, 0, 0.5);
           
        }
        #slider-2::-webkit-slider-thumb {
            border-left: 1px solid rgba(0, 0, 0, 0.5);
            
        }
        `;
    } else {
      this.shadowRoot.querySelector(
        "style[data='slider-track-style']"
      ).innerHTML = `#slider-2::-webkit-slider-thumb {
            border-right: 1px solid rgba(0, 0, 0, 0.5);
            
        }
        #slider-1::-webkit-slider-thumb {
            border-left: 1px solid rgba(0, 0, 0, 0.5);
           
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
  get searchType() {
    return this.getAttribute("search-type");
  }
  get invert() {
    return this.getAttribute("invert") === "true";
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
  set searchType(value) {
    this.setAttribute("search-type", value);
  }
  set invert(value) {
    this.setAttribute("invert", value);
  }

  _fireEvent(detail) {
    const event = new CustomEvent("state-changed", {
      bubbles: true,
      detail: detail,
    });
    this.dispatchEvent(event);
  }

  connectedCallback() {
    this.min = this.getAttribute("min") || 0;
    this.max = this.getAttribute("max") || 1;
    this.step = this.getAttribute("step") || 0.05;
    this.value1 = this.getAttribute("value1") || 0;
    this.value2 = this.getAttribute("value2") || 1;
    this.orientation = this.getAttribute("orientation") || "horizontal";
    this.searchType = this.getAttribute("search-type") || "simple";
    this.invert = this.getAttribute("invert") === "true";
    this.simpleSearch = this.getAttribute("simple-search") || "any";

    this.state.min = this.min;
    this.state.max = this.max;
    this.state.step = this.step;
    this.state.from = Math.min(+this.value1, +this.value2);
    this.state.to = Math.max(+this.value1, +this.value2);
    this.state.searchType = this.searchType;
    this.state.invert = this.invert;
    this.state.simpleSearch = this.simpleSearch;

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

    if (this.simpleSearch) {
      this.simpleSearchDiv.addEventListener("click", (e) => {
        if (e.target.tagName === "INPUT") {
          this.simpleSearch = e.target.value;
          this.state.simpleSearch = e.target.value;
          this._fireEvent(this.state);
        }
      });
    }

    this._fillSlider();
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
