import { LitElement, css, html } from "lit";
// const DEFAULT_CONDITION = {
//   frequency: {
//     from: 0, to: 1, invert: '0'
//   },
//   count: {
//     from: null, to: null
//   }
// };
const MODE = {
  frequency: "frequency",
  count: "count",
};

export class FrequencyCountValueView extends LitElement {
  static styles = css`
    :host {
      position: absolute;
      top: 0;
      left: 142px;
      display: flex;
      align-items: center;
      white-space: nowrap;
    }
    :host > .frequencygraph {
      width: 100px;
      height: 12px;
      background-color: var(--color-light-gray);
      border: solid 1px white;
      position: relative;
      margin-right: 4px;
      box-shadow: 0 0 0 1px var(--color-separator);
    }
    :host > .frequencygraph > .scale {
      position: absolute;
      top: 0;
      bottom: 0;
      border-left: dotted 1px var(--color-separator);
      opacity: 0.5;
    }

    :host > .frequencygraph > .bar {
      position: absolute;
      background-color: var(--color-key-dark3);
      height: 100%;
    }
    :host > .range {
      margin-right: 8px;
    }
    :host > .range > .from,
    :host > .range > .to {
      font-weight: bold;
    }
    :host > .filtered {
      margin: 0;
      font-size: 10px;
    }
    :host([data-mode="count"]) > .frequencygraph {
      visibility: hidden;
    }
    :host([data-filtered="false"]) > .filtered {
      visibility: hidden;
    }
    :host > .frequencygraph > .bar {
      background-color: var(--color-key-dark1);
    }
  `;

  constructor() {
    super();
    // Declare reactive properties
    this.mode; // 'frequency' or 'count'
    this.from;
    this.to;
    this.invert;
    this.filtered;
  }

  render() {
    return html`
      <div class="frequencygraph">
        <div class="bar -bar1"></div>
        <div class="bar -bar2"></div>
      </div>
      <div class="range">
        <span class="from">${this.from}</span> ~
        <span class="to">${this.to}</span>
      </div>
      <p class="filtered" ?hidden=${!this.filtered}>
        Exclude filtered out variants
      </p>
    `;
  }

  firstUpdated() {
    this._bars = this.shadowRoot.querySelectorAll(".bar");
    const _frequencyGraph = this.shadowRoot.querySelector(".frequencygraph");
    const scale = document.createElement("div");
    scale.classList.add("scale");
    for (let i = 0; i <= 10; i++) {
      const newScale = scale.cloneNode();
      newScale.style.left = `calc(${i * 10 + "%"} - ${i / 10}px)`;
      _frequencyGraph.appendChild(newScale);
    }
  }

  /**
   *
   * @param {String} mode
   * @param {Number} from
   * @param {Number} to
   * @param {String} invert
   * @param {Boolean} filtered
   */
  setValues(mode, from, to, invert, filtered) {
    this.mode = mode;
    this.from = from;
    this.to = to;
    this.invert = invert;
    this.filtered = filtered;
    this.dataset.mode = mode;

    // update value
    if (this.mode === MODE.frequency) {
      if (this.invert === "0") {
        this._bars[0].style.left = this.from * 100 + "%";
        this._bars[0].style.width = (this.to - this.from) * 100 + "%";
        this._bars[1].style.width = "0%";
      } else {
        this._bars[0].style.left = "0%";
        this._bars[0].style.width = this.from * 100 + "%";
        this._bars[1].style.left = this.to * 100 + "%";
        this._bars[1].style.width = (1 - this.to) * 100 + "%";
      }
    }

    super.update();
  }

  get queryValue() {
    const dataset = { name: this.dataset.dataset };
    const filtered = this.filtered === "true" ? true : false;
    if (this.invert === "1") {
      return {
        or: [
          {
            frequency: {
              dataset,
              frequency: {
                gte: 0,
                lte: this.from,
              },
              filtered,
            },
          },
          {
            frequency: {
              dataset,
              frequency: {
                gte: this.to,
                lte: 1,
              },
              filtered,
            },
          },
        ],
      };
    } else {
      const values = {};
      if (this.from !== "") values.gte = this.from;
      if (this.to !== "") values.lte = this.to;
      return {
        frequency: {
          dataset,
          [this.mode]: values,
          filtered,
        },
      };
    }
  }

  // update() {
  //   super.update();
  //   console.log(arguments)
  // }
}
customElements.define("frequency-count-value-view", FrequencyCountValueView);
