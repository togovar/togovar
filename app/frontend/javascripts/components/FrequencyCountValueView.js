import {LitElement, css, html} from 'lit';
const DEFAULT_CONDITION = {
  frequency: {
    from: 0, to: 1, invert: '0'
  },
  count: {
    from: null, to: null
  }
};
const MODE = {
  frequency: 'frequency',
  count: 'count'
}

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
    width: 52px;
    height: 12px;
    background-color: white;
    border: solid 1px white;
    position: relative;
    margin-right: 4px;
    box-shadow: 0 0 0 1px var(--color-separator);
  }
  :host > .frequencygraph > .bar {
    position: absolute;
    background-color: var(--color-key-dark3);
    height: 100%;
  }
  :host > .range {
    margin-right: 8px;
  }
  :host > .range > .from, :host > .range > .to {
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
  [data-value="jga_ngs"] + :host() {
    border: solid 2px red;
  }
  /*
[data-value="jga_ngs"], [data-value="jga_snp"]
  + .frequency-count-value-view
    > .frequencygraph
      > .bar
        background-color: $COLOR_DATASET_JGA
[data-value="tommo_4.7kjpn"]
  + .frequency-count-value-view
    > .frequencygraph
      > .bar
        background-color: $COLOR_DATASET_3_5KJPN
[data-value="hgvd"], [data-value="mgend"]
  + .frequency-count-value-view
    > .frequencygraph
      > .bar
        background-color: $COLOR_DATASET_HGVD
[data-value="gem_j_wga"]
  + .frequency-count-value-view
    > .frequencygraph
      > .bar
        background-color: $COLOR_DATASET_GEM_J
[data-value="bbj"]
  + .frequency-count-value-view
    > .frequencygraph
      > .bar
        background-color: $COLOR_DATASET_BBJ
[data-value="clinvar"], [data-value="exac"], [data-value="gnomad"]
  + .frequency-count-value-view
    > .frequencygraph
      > .bar
        background-color: $COLOR_DATASET_FOREIGN
        */
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
        <span class="from">${this.from}</span> ~ <span class="to">${this.to}</span>
      </div>
      <p class="filtered" ?hidden=${!this.filtered}>Exclude filtered out variants</p>
    `;
  }

  firstUpdated() {
    this._bars = this.shadowRoot.querySelectorAll('.bar');
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
      if (this.invert === '0') {
        this._bars[0].style.left = this.from * 100 + '%';
        this._bars[0].style.width = (this.to - this.from) * 100 + '%';
        this._bars[1].style.width = '0%';
      } else {
        this._bars[0].style.left = '0%';
        this._bars[0].style.width = this.from * 100 + '%';
        this._bars[1].style.left = this.to * 100 + '%';
        this._bars[1].style.width = (1 - this.to) * 100 + '%';
      }
    }
    
    super.update();
  }

  // update() {
  //   super.update();
  //   console.log(arguments)
  // }

}
customElements.define('frequency-count-value-view', FrequencyCountValueView);
