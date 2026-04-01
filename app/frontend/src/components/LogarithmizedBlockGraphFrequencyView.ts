import {
  LitElement,
  css,
  html,
  unsafeCSS,
  type TemplateResult,
} from 'lit';
import { customElement } from 'lit/decorators.js';
import type { Frequency } from '../types/api';
import checkmarkSvgUrl from '../assets/icons/checkmark.svg';

const VERTICAL_BLOCK_WIDTH = 5;
const VERTICAL_BLOCK_HEIGHT = 2;
const BLOCK_COUNT = 6;

type LogarithmizedFrequencyLabel =
  | 'na'
  | 'monomorphic'
  | '<0.0001'
  | '<0.001'
  | '<0.01'
  | '<0.05'
  | '<0.5'
  | '≥0.5';

/**
 * Converts raw allele frequency into the categorical label consumed by CSS.
 * The rendered blocks are controlled entirely by this `data-*` attribute.
 */
const getLogarithmizedFrequencyLabel = (
  frequency?: Frequency
): LogarithmizedFrequencyLabel => {
  if (!frequency) {
    return 'na';
  }

  const alleleFrequency = frequency.af;

  if (alleleFrequency !== undefined) {
    switch (true) {
      case alleleFrequency >= 0.5:
        return '≥0.5';
      case alleleFrequency > 0.05:
        return '<0.5';
      case alleleFrequency > 0.01:
        return '<0.05';
      case alleleFrequency > 0.001:
        return '<0.01';
      case alleleFrequency > 0.0001:
        return '<0.001';
      case alleleFrequency > 0:
        return '<0.0001';
      default:
        return 'monomorphic';
    }
  }

  return 'monomorphic';
};

@customElement('logarithmized-block-graph-frequency-view')
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
      height: ${VERTICAL_BLOCK_HEIGHT * BLOCK_COUNT + 5 + 4}px;
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
      content: '';
      position: absolute;
      top: -22px;
      right: -4px;
      width: 8px;
      height: 8px;
      background-color: var(--color-homozygote);
      border-radius: 2px;
      background-image: url(${unsafeCSS(checkmarkSvgUrl)});
      background-repeat: no-repeat;
      background-size: 10px 10px;
      z-index: 10;
    }
  `;

  alleleCount?: number;
  total?: number;
  frequencyValue?: number;
  alternateAlleleCount?: number;

  private _frequency?: Frequency;

  render(): TemplateResult {
    return html`
      <span class="blocks">
        ${Array.from({ length: BLOCK_COUNT }).map(
          () => html`<span class="block"></span>`
        )}
      </span>
    `;
  }

  get frequency(): Frequency | undefined {
    return this._frequency;
  }

  /**
   * Mirrors frequency data into `data-*` attributes so the CSS selectors can
   * decide how many blocks to show and whether to draw extra markers.
   */
  set frequency(frequency: Frequency | undefined) {
    this._frequency = frequency;
    this.alleleCount = frequency?.ac;
    this.total = frequency?.an;
    this.frequencyValue = frequency?.af;
    this.alternateAlleleCount = frequency?.aac;

    this._setDatasetValue('alleleCount', this.alleleCount);

    // The homozygote marker only needs to exist when a non-zero count is present.
    this._setDatasetValue(
      'alternateAlleleCount',
      this.alternateAlleleCount && this.alternateAlleleCount > 0
        ? this.alternateAlleleCount
        : undefined
    );
    this._setDatasetValue(
      'logarithmizedFrequency',
      getLogarithmizedFrequencyLabel(frequency)
    );
  }

  /**
   * `HTMLElement.dataset` stores strings only, so absent values should remove
   * the attribute instead of leaving stale state behind.
   */
  private _setDatasetValue(
    key: string,
    value: string | number | undefined
  ): void {
    if (value === undefined || value === null || value === '') {
      delete this.dataset[key];
      return;
    }

    this.dataset[key] = String(value);
  }
}
