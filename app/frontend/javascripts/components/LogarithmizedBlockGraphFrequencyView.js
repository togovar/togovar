import { LitElement, css, html } from 'lit';

const VERTICAL_BLOCK_WIDTH = 5;
const VERTICAL_BLOCK_HEIGHT = 2;

export class LogarithmizedBlockGraphFrequencyView extends LitElement {
  static styles = css`
    :host {
      --color-dataset: var(--color-dataset-foreign);
      position: relative;
      margin-right: 1px;
      border-style: solid;
      border-width: 1px;
      display: inline-block;
      width: ${VERTICAL_BLOCK_WIDTH + 4}px;
      height: ${VERTICAL_BLOCK_HEIGHT * 6 + 5 + 4}px;
      vertical-align: middle;
      font-size: 0;
      background-color: white;
    }
    :host > .display {
      position: absolute;
    }
    :host([data-count='1']) {
      background-color: var(--color-singleton);
    }
    :host([data-dataset='gem_j_wga']) {
      --color-dataset: var(--color-dataset-gemj);
    }
    :host([data-dataset^='jga_']) {
      --color-dataset: var(--color-dataset-jga);
    }
    :host([data-dataset='tommo']) {
      --color-dataset: var(--color-dataset-tommo);
    }
    :host([data-dataset='hgvd']) {
      --color-dataset: var(--color-dataset-hgvd);
    }
    :host([data-dataset='ncbn']) {
      --color-dataset: var(--color-dataset-ncbn);
    }
    :host([data-dataset='bbj']) {
      --color-dataset: var(--color-dataset-bbj);
    }
    :host {
      border-color: var(--color-dataset);
    }
    :host > .blocks {
      position: absolute;
      left: 1px;
      bottom: 1px;
      width: ${VERTICAL_BLOCK_WIDTH}px;
      display: block;
    }
    :host > .blocks > .block {
      position: absolute;
      display: none;
      width: ${VERTICAL_BLOCK_WIDTH}px;
      height: ${VERTICAL_BLOCK_HEIGHT}px;
      background-color: var(--color-dataset);
    }
    :host > .blocks > .block:nth-child(1) {
      bottom: 0;
    }
    :host > .blocks > .block:nth-child(2) {
      bottom: ${VERTICAL_BLOCK_HEIGHT + 1}px;
    }
    :host > .blocks > .block:nth-child(3) {
      bottom: ${VERTICAL_BLOCK_HEIGHT * 2 + 2}px;
    }
    :host > .blocks > .block:nth-child(4) {
      bottom: ${VERTICAL_BLOCK_HEIGHT * 3 + 3}px;
    }
    :host > .blocks > .block:nth-child(5) {
      bottom: ${VERTICAL_BLOCK_HEIGHT * 4 + 4}px;
    }
    :host > .blocks > .block:nth-child(6) {
      bottom: ${VERTICAL_BLOCK_HEIGHT * 5 + 5}px;
    }
    :host([data-logarithmized-frequency='<0.0001'])
      > .blocks
      > .block:nth-child(1),
    :host([data-logarithmized-frequency='<0.001'])
      > .blocks
      > .block:nth-child(1),
    :host([data-logarithmized-frequency='<0.001'])
      > .blocks
      > .block:nth-child(2),
    :host([data-logarithmized-frequency='<0.01'])
      > .blocks
      > .block:nth-child(1),
    :host([data-logarithmized-frequency='<0.01'])
      > .blocks
      > .block:nth-child(2),
    :host([data-logarithmized-frequency='<0.01'])
      > .blocks
      > .block:nth-child(3),
    :host([data-logarithmized-frequency='<0.05'])
      > .blocks
      > .block:nth-child(1),
    :host([data-logarithmized-frequency='<0.05'])
      > .blocks
      > .block:nth-child(2),
    :host([data-logarithmized-frequency='<0.05'])
      > .blocks
      > .block:nth-child(3),
    :host([data-logarithmized-frequency='<0.05'])
      > .blocks
      > .block:nth-child(4),
    :host([data-logarithmized-frequency='<0.5'])
      > .blocks
      > .block:nth-child(1),
    :host([data-logarithmized-frequency='<0.5'])
      > .blocks
      > .block:nth-child(2),
    :host([data-logarithmized-frequency='<0.5'])
      > .blocks
      > .block:nth-child(3),
    :host([data-logarithmized-frequency='<0.5'])
      > .blocks
      > .block:nth-child(4),
    :host([data-logarithmized-frequency='<0.5'])
      > .blocks
      > .block:nth-child(5),
    :host([data-logarithmized-frequency='≥0.5'])
      > .blocks
      > .block:nth-child(1),
    :host([data-logarithmized-frequency='≥0.5'])
      > .blocks
      > .block:nth-child(2),
    :host([data-logarithmized-frequency='≥0.5'])
      > .blocks
      > .block:nth-child(3),
    :host([data-logarithmized-frequency='≥0.5'])
      > .blocks
      > .block:nth-child(4),
    :host([data-logarithmized-frequency='≥0.5'])
      > .blocks
      > .block:nth-child(5),
    :host([data-logarithmized-frequency='≥0.5'])
      > .blocks
      > .block:nth-child(6) {
      display: block;
    }
    :host([data-logarithmized-frequency='na']) {
      border-color: #d4d3d1;
      background-color: #f4f4f4;
    }
  `;

  constructor() {
    super();
    // Declare reactive properties
    this.dataset;
    this.count;
    this.total;
    this.frequencyValue;
  }

  render() {
    return html` <span class="blocks"
        ><span class="block"></span><span class="block"></span
        ><span class="block"></span><span class="block"></span
        ><span class="block"></span><span class="block"></span
      ></span>
      <span class="display"
        >${this.dataset.dataset}:
        &nbsp;${this.count}/${this.total}&nbsp;${this.frequencyValue}</span
      >`;
  }

  firstUpdated() { }

  /**
   *
   * @param {object} frequency
   * @param {number} frequency.an
   * @param {number} frequency.ac
   * @param {number} frequency.af
   * @param {string[]} frequency.filter
   * @param {number} frequency.quality
   * @param {string} frequency.source
   */
  set frequency(frequency) {
    this.dataset.count = frequency?.ac;
    let logarithmizedFrequency = 'na';
    if (frequency) {
      this.count = frequency.ac;
      this.total = frequency.an;
      this.frequencyValue = frequency.af;
      switch (true) {
        case frequency.af >= 0.5:
          logarithmizedFrequency = '≥0.5';
          break;
        case frequency.af > 0.05:
          logarithmizedFrequency = '<0.5';
          break;
        case frequency.af > 0.01:
          logarithmizedFrequency = '<0.05';
          break;
        case frequency.af > 0.001:
          logarithmizedFrequency = '<0.01';
          break;
        case frequency.af > 0.0001:
          logarithmizedFrequency = '<0.001';
          break;
        case frequency.af > 0:
          logarithmizedFrequency = '<0.0001';
          break;
        default:
          logarithmizedFrequency = 'monomorphic';
          break;
      }
    }
    this.dataset.logarithmizedFrequency = logarithmizedFrequency;
  }
}
customElements.define(
  'logarithmized-block-graph-frequency-view',
  LogarithmizedBlockGraphFrequencyView
);
