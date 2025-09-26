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

/**
 * Display mode constants definition
 */
const MODE = {
  frequency: 'frequency',
  count: 'count',
  alt_alt: 'aac',
  alt_ref: 'arc',
  hemi_alt: 'hac',
} as const;

type ModeKey = keyof typeof MODE;

const DATASET_MODES = ['frequency', 'count'] as const;
type DatasetMode = (typeof DATASET_MODES)[number];
const isDatasetMode = (m: ModeKey): m is DatasetMode =>
  (DATASET_MODES as readonly string[]).includes(m);

const GENOTYPE_MODES = ['alt_alt', 'alt_ref', 'hemi_alt'] as const;
type GenotypeMode = (typeof GENOTYPE_MODES)[number];
const GENOTYPE_MODE_TO_KEY = {
  alt_alt: 'aac',
  alt_ref: 'arc',
  hemi_alt: 'hac',
} as const satisfies Record<GenotypeMode, GenotypeKey>;
const isGenotypeMode = (m: string): m is GenotypeMode =>
  (GENOTYPE_MODES as readonly string[]).includes(m);

/**
 * Web component for visualizing frequency count values
 */
@customElement('frequency-count-value-view')
export class FrequencyCountValueView extends LitElement {
  static styles = [Style];

  /** Type of condition for query building ('dataset' or 'genotype') */
  @property({ type: String }) conditionType: 'dataset' | 'genotype' = 'dataset';

  /** Display mode */
  @property({ type: String }) mode: DatasetMode | GenotypeMode = 'frequency';

  /** Range start value */
  @property({ type: Number }) from: number = 0;

  /** Range end value */
  @property({ type: Number }) to: number = 1;

  /** Invert mode flag */
  @property({ type: String }) invert: string = '0';

  /** Filtering status */
  @property({ type: Boolean }) filtered: boolean = false;

  /** Reference to bar elements */
  private _bars: NodeListOf<HTMLElement> | undefined;

  /**
   * Generates the HTML template for the component
   * @returns TemplateResult for rendering
   */
  render(): TemplateResult {
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
   * @private
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
    mode: ModeKey,
    from: number,
    to: number,
    invert: string,
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
   * @private
   */
  private _updateBarVisualization(): void {
    if (this.mode !== MODE.frequency || !this._bars) return;

    if (this.invert === '0') {
      this._setNormalBarMode();
    } else {
      this._setInvertBarMode();
    }
  }

  /**
   * Sets normal bar display mode
   * @private
   */
  private _setNormalBarMode(): void {
    if (!this._bars) return;

    this._bars[0].style.left = `${this.from * 100}%`;
    this._bars[0].style.width = `${(this.to - this.from) * 100}%`;
    this._bars[1].style.width = '0%';
  }

  /**
   * Sets inverted bar display mode
   * @private
   */
  private _setInvertBarMode(): void {
    if (!this._bars) return;

    this._bars[0].style.left = '0%';
    this._bars[0].style.width = `${this.from * 100}%`;
    this._bars[1].style.left = `${this.to * 100}%`;
    this._bars[1].style.width = `${(1 - this.to) * 100}%`;
  }

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
   * @private
   */
  private _buildDatasetQuery(dataset: {
    name: FrequencyDataset;
  }): FrequencyQuery {
    if (this.invert === '1') {
      return this._buildInvertedDatasetQuery(dataset);
    } else {
      return this._buildNormalDatasetQuery(dataset);
    }
  }

  /**
   * Builds inverted query object for dataset condition
   * @param dataset - Dataset information object
   * @returns Inverted query object with OR conditions
   * @private
   */
  private _buildInvertedDatasetQuery(dataset: {
    name: FrequencyDataset;
  }): FrequencyQuery {
    const left: FrequencyLeaf = {
      frequency: {
        dataset,
        frequency: { gte: 0, lte: this.from },
        filtered: this.filtered,
      },
    };
    const right: FrequencyLeaf = {
      frequency: {
        dataset,
        frequency: { gte: this.to, lte: 1 },
        filtered: this.filtered,
      },
    };
    return { or: [left, right] };
  }

  /**
   * Builds normal query object for dataset condition
   * @param dataset - Dataset information object
   * @returns Normal query object with range values
   * @private
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
   * @private
   */
  private _buildGenotypeQuery(dataset: {
    name: FrequencyDataset;
  }): GenotypeCount {
    const values = this._buildRangeValues();

    if (!isGenotypeMode(this.mode)) {
      throw new Error(`invalid genotype mode: ${this.mode}`);
    }

    const key: GenotypeKey = GENOTYPE_MODE_TO_KEY[this.mode];

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
   * @private
   */
  private _buildRangeValues(): ScoreRange {
    const hasFrom = String(this.from) !== '';
    const hasTo = String(this.to) !== '';
    if (hasFrom && hasTo) return { gte: this.from, lte: this.to };
    if (hasFrom) return { gte: this.from };
    if (hasTo) return { lte: this.to };
    // どちらも未指定の場合の扱いは仕様に合わせて。ここでは全域を返す例。
    return { gte: 0, lte: 1 };
  }
}

export default FrequencyCountValueView;
