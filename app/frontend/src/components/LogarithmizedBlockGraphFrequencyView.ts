import {
  LitElement,
  html,
  type TemplateResult,
  type CSSResultGroup,
} from 'lit';
import { customElement } from 'lit/decorators.js';
import type { Frequency } from '../types/api';
import Styles from '../../stylesheets/object/component/logarithmized-block-graph-frequency-view.scss';

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
  static styles: CSSResultGroup = [Styles];

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
