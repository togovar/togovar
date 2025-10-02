import { createEl } from '../../../utils/dom/createEl';
import type { ConditionItemView } from '../ConditionItemView';
import { ConditionValueEditor } from './ConditionValueEditor';
import type ConditionValues from '../ConditionValues.js';
import '../../../components/RangeSliderView.js';
import type { FrequencyCountValueView } from '../../../components/FrequencyCountValueView';

/**
 * Interface for frequency condition values
 */
interface ConditionFrequency {
  from: number;
  to: number;
  invert: string;
}

/**
 * Interface for count condition values
 */
interface ConditionCount {
  from: number | null;
  to: number | null;
}

/**
 * Combined condition interface containing both frequency and count conditions
 */
interface Condition {
  frequency: ConditionFrequency;
  count: ConditionCount;
  alt_alt: ConditionCount;
  alt_ref: ConditionCount;
  hemi_alt: ConditionCount;
}

/**
 * Interface for range selector custom element
 */
interface RangeSliderElement extends HTMLElement {
  searchType: string;
  sliderStep: number;
  inputStep: number;
}

let id: number = 0;

/**
 * Default condition values for both frequency and count modes
 */
const DEFAULT_CONDITION: Condition = {
  frequency: {
    from: 0,
    to: 1,
    invert: '0',
  },
  count: {
    from: null,
    to: null,
  },
  alt_alt: {
    from: null,
    to: null,
  },
  alt_ref: {
    from: null,
    to: null,
  },
  hemi_alt: {
    from: null,
    to: null,
  },
};

/**
 * Available modes for the condition editor
 */
const MODE = {
  frequency: 'frequency',
  count: 'count',
  alt_alt: 'alt_alt',
  alt_ref: 'alt_ref',
  hemi_alt: 'hemi_alt',
} as const;

type ModeType = (typeof MODE)[keyof typeof MODE];

/**
 * Condition value editor for frequency and count filtering
 * Provides UI controls for setting frequency ranges and count ranges for variant filtering
 */
export default class ConditionValueEditorFrequencyCount extends ConditionValueEditor {
  #conditionType: 'dataset' | 'genotype';
  _condition: Condition;
  _mode: ModeType;
  _rangeSelectorView: RangeSliderElement | null = null;
  _filtered: HTMLInputElement | null = null;
  _lastValue: ConditionFrequency | ConditionCount | null = null;

  /**
   * Creates a new frequency/count condition editor
   * @param valuesView - The parent values view component
   * @param conditionView - The parent condition view component
   */
  constructor(valuesView: ConditionValues, conditionView: ConditionItemView) {
    super(valuesView, conditionView);

    this.#conditionType = conditionView.conditionType;
    this._condition = {
      frequency: Object.assign({}, DEFAULT_CONDITION.frequency),
      count: Object.assign({}, DEFAULT_CONDITION.count),
      alt_alt: Object.assign({}, DEFAULT_CONDITION.alt_alt),
      alt_ref: Object.assign({}, DEFAULT_CONDITION.alt_ref),
      hemi_alt: Object.assign({}, DEFAULT_CONDITION.hemi_alt),
    };
    this._mode =
      this.#conditionType === 'genotype' ? MODE.alt_alt : MODE.frequency;

    this._initializeComponent();
    this._setupEventListeners();
    this._observeValueChanges();
  }

  /**
   * Observes changes in the values view and triggers updates
   */
  private _observeValueChanges(): void {
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(() => this._update());
    });
    observer.observe(this._valuesElement, {
      attributes: false,
      childList: true,
      subtree: false,
    });
  }

  /**
   * Initializes the component's HTML structure
   */
  private _initializeComponent(): void {
    const name = `ConditionValueEditorFrequencyCount${id++}`;

    this._createElement(
      'frequency-count-editor-view',
      this._generateHTML(name)
    );

    this._setupRangeSlider();
  }

  /**
   * Generates the HTML template for the component
   * @param name - Unique name for radio button grouping
   * @returns HTML string template
   */
  private _generateHTML(name: string): string {
    if (this.#conditionType === 'genotype') {
      return this._generateGenotypeHTML(name);
    }
    return this._generateDatasetHTML(name);
  }

  /**
   * Generates HTML for dataset condition type
   * @param name - Unique name for radio button grouping
   * @returns HTML string template
   */
  private _generateDatasetHTML(name: string): string {
    const frequencySection = `
      <section class="frequency switching" data-mode="${MODE.frequency}">
        <label>
          <input type="radio" name="${name}" value="${MODE.frequency}">
          <span>Frequency</span>
        </label>
        <div class="range-selector-view input"></div>
      </section>`;

    const countSection = this._generateCountSection(name, MODE.count, 'Count');

    return `
    <header>Specify range</header>
    <div class="body">
      ${frequencySection}
      ${countSection}
      ${this._generateFilteredSection()}
    </div>`;
  }

  /**
   * Generates HTML for genotype dataset condition type
   * @param name - Unique name for radio button grouping
   * @returns HTML string template
   */
  private _generateGenotypeHTML(name: string): string {
    const genotypeOptions = [
      { mode: MODE.alt_alt, label: 'Alt/Alt: Number of homozygous genotypes' },
      {
        mode: MODE.alt_ref,
        label: 'Alt/Ref: Number of heterozygous genotypes',
      },
      {
        mode: MODE.hemi_alt,
        label: 'Hemi_Alt: Number of hemizygous genotypes',
      },
    ];

    const sections = genotypeOptions
      .map((option) =>
        this._generateCountSection(name, option.mode, option.label)
      )
      .join('');

    return `
    <header>Specify range</header>
    <div class="body">
      ${sections}
      ${this._generateFilteredSection()}
    </div>`;
  }

  /**
   * Generates a count input section
   * @param name - Radio button group name
   * @param mode - Mode value for the section
   * @param label - Display label for the section
   * @returns HTML string for a single count section
   */
  private _generateCountSection(
    name: string,
    mode: string,
    label: string
  ): string {
    return `
      <section class="count switching" data-mode="${mode}">
        <label>
          <input type="radio" name="${name}" value="${mode}">
          <span>${label}</span>
        </label>
        <div class="input">
          <input class="from" min="0" step="1" type="number">
          ~
          <input class="to" min="0" step="1" type="number">
        </div>
      </section>`;
  }

  /**
   * Generates the filtered checkbox section
   * @returns HTML string for the filtered section
   */
  private _generateFilteredSection(): string {
    return `
      <section class="filtered">
        <label>
          <input type="checkbox" checked>
          <span>Exclude filtered out variants</span>
        </label>
      </section>`;
  }

  /**
   * Sets up the range slider component
   */
  private _setupRangeSlider(): void {
    const rangeSlider = document.createElement(
      'range-slider'
    ) as RangeSliderElement;
    rangeSlider.searchType = 'advanced';
    rangeSlider.sliderStep = 0.01;
    rangeSlider.inputStep = 0.05;
    rangeSlider.addEventListener('range-changed', (e: CustomEvent) => {
      e.stopPropagation();
      this.changeParameter(e.detail);
    });

    const container = this.sectionEl.querySelector('.range-selector-view');
    if (container) {
      container.appendChild(rangeSlider);
    }

    this._rangeSelectorView = rangeSlider;
  }

  /**
   * Sets up all event listeners for the component
   */
  private _setupEventListeners(): void {
    this._setupModeToggleListeners();
    this._setupCountInputListeners();
    this._setupFilteredCheckboxListener();
  }

  /**
   * Sets up event listeners for mode toggle radio buttons
   */
  private _setupModeToggleListeners(): void {
    const switchingElements = this.bodyEl.querySelectorAll(
      ':scope > .switching'
    );

    for (const el of switchingElements) {
      const input = el.querySelector(
        ':scope > label > input'
      ) as HTMLInputElement;
      if (!input) continue;

      input.addEventListener('change', (e) => {
        this._handleModeChange(e, switchingElements);
      });

      // Set default selection based on condition type
      const defaultMode =
        this.#conditionType === 'genotype' ? MODE.alt_alt : MODE.frequency;
      if (input.value === defaultMode) {
        requestAnimationFrame(() => {
          input.dispatchEvent(new Event('change'));
          input.checked = true;
        });
      }
    }
  }

  /**
   * Handles mode change events
   * @param e - Change event
   * @param switchingElements - All switching elements
   */
  private _handleModeChange(
    e: Event,
    switchingElements: NodeListOf<Element>
  ): void {
    const target = e.target as HTMLInputElement;

    // Update visual state of switching elements
    for (const el of switchingElements) {
      const htmlEl = el as HTMLElement;
      if (htmlEl.dataset.mode === target.value) {
        htmlEl.classList.add('-current');
      } else {
        htmlEl.classList.remove('-current');
      }
    }

    this._mode = target.value as ModeType;
    this._update();
  }

  /**
   * Sets up event listeners for count input fields
   */
  private _setupCountInputListeners(): void {
    const switchingElements = this.bodyEl.querySelectorAll(
      ':scope > .switching'
    );

    // Set up input listeners for all switching sections
    switchingElements.forEach((element) => {
      const inputs = element.querySelectorAll(':scope > .input > input');
      inputs.forEach((input) => {
        input.addEventListener('change', (e) => {
          this._handleCountInputChange(e);
        });
      });
    });
  }

  /**
   * Handles count input change events
   * @param e - Change event from count input
   */
  private _handleCountInputChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    const key = target.className as keyof ConditionCount;
    const currentCondition = this._condition[this._mode] as ConditionCount;
    if (currentCondition) {
      (currentCondition as any)[key] = Number(target.value);
      this._update();
    }
  }

  /**
   * Sets up event listener for filtered checkbox
   */
  private _setupFilteredCheckboxListener(): void {
    this._filtered = this.bodyEl.querySelector(
      ':scope > .filtered > label > input'
    );
    if (this._filtered) {
      this._filtered.addEventListener('change', () => {
        this._update();
      });
      this._filtered.dispatchEvent(new Event('change'));
    }
  }

  /**
   * Updates the condition parameters based on range slider changes
   * @param newCondition - New condition values from range slider
   */
  changeParameter(newCondition: Partial<ConditionFrequency>): void {
    if (!this._rangeSelectorView) return;

    for (const key in newCondition) {
      if (key in this._condition.frequency) {
        (this._condition.frequency as any)[key] = (newCondition as any)[key];
      }
    }
    this._update();
  }

  /**
   * Stores the current values for potential restoration
   */
  keepLastValues(): void {
    const currentCondition = this._condition[this._mode];
    if (currentCondition) {
      this._lastValue = { ...currentCondition };
    }
  }

  /**
   * Restores previously stored values
   */
  restore(): void {
    if (this._lastValue && this._condition[this._mode]) {
      this._condition[this._mode] = this._lastValue as any;
      this._update();
    }
  }

  /**
   * Triggers a search operation
   */
  search(): void {
    this._update();
  }

  /**
   * Gets the validation state of the current condition
   * @returns True if the condition is valid
   */
  get isValid(): boolean {
    return this._validate();
  }

  /**
   * Updates the component state and validates conditions
   */
  private _update(): void {
    this._statsApplyToFreqCountViews();
    this._valuesView.update(this._validate());
  }

  /**
   * Applies current condition values to frequency count views
   */
  private _statsApplyToFreqCountViews(): void {
    this._valuesElement
      .querySelectorAll(':scope > condition-item-value-view')
      .forEach((view) => {
        const freqCountView = this._getFrequencyCountView(view);
        if (!freqCountView) return;

        this._updateFrequencyCountView(freqCountView);
      });
  }

  /**
   * Gets the frequency count view from a condition item value view
   * @param view - Parent view element
   * @returns Frequency count view element or null
   */
  private _getFrequencyCountView(
    view: Element
  ): FrequencyCountValueView | null {
    const shadowRoot = (view as any).shadowRoot;
    if (!shadowRoot) return null;

    const freqCountView = shadowRoot.querySelector(
      'frequency-count-value-view'
    ) as FrequencyCountValueView;
    return freqCountView && typeof freqCountView.setValues === 'function'
      ? freqCountView
      : null;
  }

  /**
   * Updates a frequency count view with current condition values
   * @param freqCountView - The frequency count view to update
   */
  private _updateFrequencyCountView(
    freqCountView: FrequencyCountValueView
  ): void {
    const currentCondition = this._condition[this._mode];
    const invertValue =
      this._mode === MODE.frequency ? this._condition.frequency.invert : '';
    const isFiltered = this._filtered?.checked ?? false;

    freqCountView.setValues(
      this.#conditionType,
      this._mode,
      currentCondition.from ?? '',
      currentCondition.to ?? '',
      invertValue,
      isFiltered
    );

    freqCountView.mode = this._mode;
    freqCountView.from = currentCondition.from ?? '';
    freqCountView.update();
  }

  /**
   * Validates the current condition
   * @returns True if any condition value is not null
   */
  private _validate(): boolean {
    const currentCondition = this._condition[this._mode];
    if (!currentCondition) {
      return false;
    }
    return Object.values(currentCondition).some((value) => value !== null);
  }
}
