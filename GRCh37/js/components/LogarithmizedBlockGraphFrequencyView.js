import{LitElement,css,html}from"lit";const VERTICAL_BLOCK_WIDTH=5,VERTICAL_BLOCK_HEIGHT=2;export class LogarithmizedBlockGraphFrequencyView extends LitElement{static styles=css`
    :host {
      --color-dataset: var(--color-dataset-foreign);
      position: relative;
      margin-right: 1px;
      border-style: solid;
      border-width: 1px;
      display: inline-block;
      width: ${9}px;
      height: ${21}px;
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
      width: ${5}px;
      display: block;
    }
    :host > .blocks > .block {
      position: absolute;
      display: none;
      width: ${5}px;
      height: ${2}px;
      background-color: var(--color-dataset);
    }
    :host > .blocks > .block:nth-child(1) {
      bottom: 0;
    }
    :host > .blocks > .block:nth-child(2) {
      bottom: ${3}px;
    }
    :host > .blocks > .block:nth-child(3) {
      bottom: ${6}px;
    }
    :host > .blocks > .block:nth-child(4) {
      bottom: ${9}px;
    }
    :host > .blocks > .block:nth-child(5) {
      bottom: ${12}px;
    }
    :host > .blocks > .block:nth-child(6) {
      bottom: ${15}px;
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
  `;constructor(){super(),this.dataset,this.alleleCount,this.total,this.frequencyValue,this.alternateAlleleCount}render(){return html`
      <span class="blocks">
        ${Array.from({length:6}).map(()=>html`<span class="block"></span>`)}
      </span>
    `}firstUpdated(){}set frequency(t){this.dataset.alleleCount=t?.ac,t?.aac&&(this.dataset.alternateAlleleCount=t.aac);let o="na";if(t)switch(this.alleleCount=t.ac,this.total=t.an,this.frequencyValue=t.af,!0){case t.af>=.5:o="≥0.5";break;case t.af>.05:o="<0.5";break;case t.af>.01:o="<0.05";break;case t.af>.001:o="<0.01";break;case t.af>1e-4:o="<0.001";break;case t.af>0:o="<0.0001";break;default:o="monomorphic"}this.dataset.logarithmizedFrequency=o}}customElements.define("logarithmized-block-graph-frequency-view",LogarithmizedBlockGraphFrequencyView);