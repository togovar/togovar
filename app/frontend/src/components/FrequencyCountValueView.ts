import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import Style from '../../stylesheets/object/component/frequency-count-value-view.scss';

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

type ModeType = (typeof MODE)[keyof typeof MODE];

/**
 * Web component for visualizing frequency count values
 */
@customElement('frequency-count-value-view')
export class FrequencyCountValueView extends LitElement {
  static styles = [Style];

  @property({ type: String }) conditionType: 'dataset' | 'genotype';

  /** Display mode */
  @property({ type: String }) mode: ModeType = MODE.frequency;

  /** Range start value */
  @property({ type: Number }) from: number = 0;

  /** Range end value */
  @property({ type: Number }) to: number = 1;

  /** Invert mode flag */
  @property({ type: String }) invert: String = '0';

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
    mode: ModeType,
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

  // /**
  //  * Generates query value object
  //  * @returns Query parameter object
  //  */
  get queryValue() {
    const dataset = { name: this.dataset.dataset };

    if (this.conditionType === 'dataset') {
      if (this.invert === '1') {
        return {
          or: [
            {
              frequency: {
                dataset,
                frequency: {
                  gte: 0,
                  lte: this.from,
                },
                filtered: this.filtered,
              },
            },
            {
              frequency: {
                dataset,
                frequency: {
                  gte: this.to,
                  lte: 1,
                },
                filtered: this.filtered,
              },
            },
          ],
        };
      } else {
        const values: Record<string, number> = {};
        if (String(this.from) !== '') values.gte = this.from;
        if (String(this.to) !== '') values.lte = this.to;
        return {
          frequency: {
            dataset,
            [this.mode]: values,
            filtered: this.filtered,
          },
        };
      }
    } else {
      const values: Record<string, number> = {};

      if (String(this.from) !== '') values.gte = this.from;
      if (String(this.to) !== '') values.lte = this.to;
      return {
        frequency: {
          dataset,
          genotype: {
            key: MODE[this.mode],
            count: values,
          },
          filtered: this.filtered,
        },
      };
    }
  }
}

export default FrequencyCountValueView;
