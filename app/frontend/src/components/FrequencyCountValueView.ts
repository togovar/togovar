import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import Style from '../../stylesheets/object/component/frequency-count-value-view.scss';
import type {
  ScoreRange,
  FrequencyLeaf,
  FrequencyQuery,
  GenotypeCount,
} from '../types';
import type { FrequencyDataset, GenotypeKey } from '../definition';

// Display mode constants definition
export const MODE = {
  frequency: 'frequency',
  count: 'count',
  alt_alt: 'aac',
  alt_ref: 'arc',
  hemi_alt: 'hac',
} as const;

const DATASET_MODES = ['frequency', 'count'] as const;
type DatasetMode = (typeof DATASET_MODES)[number];
const isDatasetMode = (m: DatasetMode | GenotypeMode): m is DatasetMode =>
  (DATASET_MODES as readonly string[]).includes(m);

const GENOTYPE_MODES = ['aac', 'arc', 'hac'] as const;
type GenotypeMode = (typeof GENOTYPE_MODES)[number];
const isGenotypeMode = (m: DatasetMode | GenotypeMode): m is GenotypeMode =>
  (GENOTYPE_MODES as readonly string[]).includes(m);

/**
 * Web component for visualizing frequency count values
 */
@customElement('frequency-count-value-view')
export class FrequencyCountValueView extends LitElement {
  static styles = [Style];

  @property({ type: String }) conditionType: 'dataset' | 'genotype' = 'dataset';
  @property({ type: String }) mode: DatasetMode | GenotypeMode = 'frequency';
  @property({ type: Number }) from: number | null = 0;
  @property({ type: Number }) to: number | null = 1;
  @property({ type: Boolean }) invert: boolean = false;
  @property({ type: Boolean }) filtered: boolean = false;

  private _bars: NodeListOf<HTMLElement> | undefined;

  /**
   * Generates the HTML template for the component
   * @returns TemplateResult for rendering
   */
  render(): TemplateResult {
    return html`
      <div class="frequencygraph" ?hidden=${this.mode !== MODE.frequency}>
        <div class="bar -bar1"></div>
        <div class="bar -bar2"></div>
      </div>
      <div class="range">
        <span class="from">${this.from}</span>
        ~
        <span class="to">${this.to}</span>
      </div>
      <p class="filtered" ?hidden=${!this.filtered}>
        Exclude filtered out variants
      </p>
    `;
  }

  /**
   * Initialization process after first rendering
   * Creates scale elements and gets references to bar elements
   */
  firstUpdated(): void {
    this._bars = this.shadowRoot!.querySelectorAll('.bar');
    this._createScaleElements();
  }

  /**
   * Creates scale elements and adds them to the frequency graph
   */
  private _createScaleElements(): void {
    const frequencyGraph = this.shadowRoot!.querySelector(
      '.frequencygraph'
    ) as HTMLElement;
    const scaleTemplate = document.createElement('div');
    scaleTemplate.classList.add('scale');

    for (let i = 0; i <= 10; i++) {
      const scale = scaleTemplate.cloneNode() as HTMLElement;
      scale.style.left = `calc(${i * 10}% - ${i / 10}px)`;
      frequencyGraph.appendChild(scale);
    }
  }

  /**
   * Sets component values and updates display
   * @param conditionType - Type of condition ('dataset' or 'genotype')
   * @param mode - Display mode
   * @param from - Range start value
   * @param to - Range end value
   * @param invert - Invert mode flag
   * @param filtered - Filtering status
   */
  setValues(
    conditionType: 'dataset' | 'genotype',
    mode: DatasetMode | GenotypeMode,
    from: number | null,
    to: number | null,
    invert: boolean,
    filtered: boolean
  ): void {
    this.conditionType = conditionType;
    this.mode = mode;
    this.from = from;
    this.to = to;
    this.invert = invert;
    this.filtered = filtered;
    this.dataset.mode = mode;

    this._updateBarVisualization();
    this.requestUpdate();
  }

  /**
   * Updates bar visualization
   */
  private _updateBarVisualization(): void {
    if (this.mode !== MODE.frequency || !this._bars) return;

    if (!this.invert) {
      this._setNormalBarMode();
    } else {
      this._setInvertBarMode();
    }
  }

  /**
   * Sets normal bar display mode
   */
  private _setNormalBarMode(): void {
    if (!this._bars || this.from === null || this.to === null) return;

    this._bars[0].style.left = `${this.from * 100}%`;
    this._bars[0].style.width = `${(this.to - this.from) * 100}%`;
    this._bars[1].style.width = '0%';
  }

  /**
   * Sets inverted bar display mode
   */
  private _setInvertBarMode(): void {
    if (!this._bars || this.from === null || this.to === null) return;

    this._bars[0].style.left = '0%';
    this._bars[0].style.width = `${this.from * 100}%`;
    this._bars[1].style.left = `${this.to * 100}%`;
    this._bars[1].style.width = `${(1 - this.to) * 100}%`;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Query
  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Generates query value object based on current component state
   * @returns Query parameter object for filtering
   */
  get queryValue(): FrequencyQuery {
    const nameStr = this.dataset?.dataset ?? '';

    const dataset: { name: FrequencyDataset } = {
      name: nameStr as FrequencyDataset,
    };

    if (this.conditionType === 'dataset') {
      return this._buildDatasetQuery(dataset);
    } else {
      return this._buildGenotypeQuery(dataset);
    }
  }

  /**
   * Builds query object for dataset condition type
   * @param dataset - Dataset information object
   * @returns Query object for dataset filtering
   */
  private _buildDatasetQuery(dataset: {
    name: FrequencyDataset;
  }): FrequencyQuery {
    if (this.invert) {
      return this._buildInvertedDatasetQuery(dataset);
    } else {
      return this._buildNormalDatasetQuery(dataset);
    }
  }

  /**
   * Builds inverted query object for dataset condition
   * @param dataset - Dataset information object
   * @returns Inverted query object with OR conditions
   */
  private _buildInvertedDatasetQuery(dataset: {
    name: FrequencyDataset;
  }): FrequencyQuery {
    const from = this.from ?? 0;
    const to = this.to ?? 1;
    const left: FrequencyLeaf = {
      frequency: {
        dataset,
        frequency: { gte: 0, lte: from },
        filtered: this.filtered,
      },
    };
    const right: FrequencyLeaf = {
      frequency: {
        dataset,
        frequency: { gte: to, lte: 1 },
        filtered: this.filtered,
      },
    };
    return { or: [left, right] };
  }

  /**
   * Builds normal query object for dataset condition
   * @param dataset - Dataset information object
   * @returns Normal query object with range values
   */
  private _buildNormalDatasetQuery(dataset: {
    name: FrequencyDataset;
  }): FrequencyLeaf {
    if (!isDatasetMode(this.mode)) {
      throw new Error(`invalid dataset mode: ${this.mode}`);
    }
    const field: DatasetMode = this.mode;
    const values = this._buildRangeValues();
    return {
      frequency: {
        dataset,
        [field]: values,
        filtered: this.filtered,
      },
    } as FrequencyLeaf;
  }

  /**
   * Builds query object for genotype condition type
   * @param dataset - Dataset information object
   * @returns Query object for genotype filtering
   */
  private _buildGenotypeQuery(dataset: {
    name: FrequencyDataset;
  }): GenotypeCount {
    const values = this._buildRangeValues();

    if (!isGenotypeMode(this.mode)) {
      throw new Error(`invalid genotype mode: ${this.mode}`);
    }

    const key: GenotypeKey = this.mode as GenotypeMode;

    return {
      frequency: {
        dataset,
        genotype: { key, count: values },
        filtered: this.filtered,
      },
    };
  }

  /**
   * Builds range values object from current from/to properties
   * @returns Object containing gte and/or lte values
   */
  private _buildRangeValues(): ScoreRange {
    const hasFrom = this.from !== null && String(this.from) !== '';
    const hasTo = this.to !== null && String(this.to) !== '';
    if (hasFrom && hasTo) return { gte: this.from!, lte: this.to! };
    if (hasFrom) return { gte: this.from! };
    if (hasTo) return { lte: this.to! };

    // If no value is present, cannot build a valid range query
    throw new Error(
      `Cannot build range values: both from and to are null or empty for mode ${this.mode}`
    );
  }
}

export default FrequencyCountValueView;
