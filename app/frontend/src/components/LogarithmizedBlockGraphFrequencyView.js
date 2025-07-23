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
    :host([data-allele-count='1']) {
      background-color: var(--color-singleton);
    }
    :host([data-alternate-allele-count]) > .blocks::before {
      content: 'H';
      position: absolute;
      top: -24px;
      right: -5px;
      background-color: var(--color-homozygote);
      color: white;
      font-size: 8px;
      font-weight: bold;
      width: 9px;
      height: 9px;
      text-align: center;
      line-height: 9px;
      z-index: 10;
    }
  `;

  constructor() {
    super();
    // Declare reactive properties
    this.dataset;
    this.alleleCount;
    this.total;
    this.frequencyValue;
    this.alternateAlleleCount;
  }

  render() {
    return html`
      <span class="blocks">
        ${Array.from({ length: 6 }).map(
          () => html`<span class="block"></span>`
        )}
      </span>
    `;
  }

  firstUpdated() {}

  /** Setter for variant frequency information.
   *
   * This method receives a frequency object containing various metrics related to variant frequency.
   * It updates internal dataset fields such as allele count, alternate allele count, total allele number,
   * frequency value, and a categorized frequency label (`logarithmizedFrequency`) used for display or filtering.
   *
   * @param {Object} frequency - Frequency data for the variant.
   * @param {number} frequency.ac - Allele count.
   * @param {number} frequency.an - Total number of alleles.
   * @param {number} frequency.af - Allele frequency (between 0 and 1).
   * @param {number} [frequency.aac] - Alternate allele count (optional, may be used for singleton detection).
   * @param {string[]} frequency.filter - Filters applied to the variant.
   * @param {number} frequency.quality - Variant calling quality score.
   * @param {string} frequency.source - Source of the frequency data. */
  set frequency(frequency) {
    this.dataset.alleleCount = frequency?.ac;

    if (frequency?.aac) {
      this.dataset.alternateAlleleCount = frequency.aac;
    }

    let logarithmizedFrequency = 'na';
    if (frequency) {
      this.alleleCount = frequency.ac;
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
