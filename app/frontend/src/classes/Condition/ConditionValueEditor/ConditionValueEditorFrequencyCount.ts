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

    this._condition = {
      frequency: Object.assign({}, DEFAULT_CONDITION.frequency),
      count: Object.assign({}, DEFAULT_CONDITION.count),
      alt_alt: Object.assign({}, DEFAULT_CONDITION.alt_alt),
      alt_ref: Object.assign({}, DEFAULT_CONDITION.alt_ref),
      hemi_alt: Object.assign({}, DEFAULT_CONDITION.hemi_alt),
    };
    this._mode =
      this._conditionType === 'genotype' ? MODE.alt_alt : MODE.frequency;

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

    this._createElement('frequency-count-editor-view', () => [
      createEl('header', { text: 'Specify range' }),
      createEl('div', {
        class: 'body',
        children: this._createBodyElements(name),
      }),
    ]);

    this._setupRangeSlider();
  }

  /**
   * Creates the body elements for the component
   * @param name - Unique name for radio button grouping
   * @returns Array of HTML elements
   */
  private _createBodyElements(name: string): HTMLElement[] {
    if (this._conditionType === 'genotype') {
      return this._createGenotypeElements(name);
    }
    return this._createDatasetElements(name);
  }

  /**
   * Creates elements for dataset condition type
   * @param name - Unique name for radio button grouping
   * @returns Array of HTML elements
   */
  private _createDatasetElements(name: string): HTMLElement[] {
    const frequencySection = this._createFrequencySection(name);
    const countSection = this._createCountSection(name, MODE.count, 'Count');
    const filteredSection = this._createFilteredSection();

    return [frequencySection, countSection, filteredSection];
  }

  /**
   * Creates elements for genotype dataset condition type
   * @param name - Unique name for radio button grouping
   * @returns Array of HTML elements
   */
  private _createGenotypeElements(name: string): HTMLElement[] {
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

    const sections = genotypeOptions.map((option) =>
      this._createCountSection(name, option.mode, option.label)
    );

    const filteredSection = this._createFilteredSection();
    return [...sections, filteredSection];
  }

  /**
   * Creates a frequency section with range slider
   * @param name - Radio button group name
   * @returns HTML element for frequency section
   */
  private _createFrequencySection(name: string): HTMLElement {
    return createEl('section', {
      class: ['frequency', 'switching'],
      dataset: { mode: MODE.frequency },
      children: [
        createEl('label', {
          children: [
            createEl('input', {
              attrs: {
                type: 'radio',
                name,
                value: MODE.frequency,
              },
            }),
            createEl('span', { text: 'Frequency' }),
          ],
        }),
        createEl('div', { class: ['range-selector-view', 'input'] }),
      ],
    });
  }

  /**
   * Creates a count input section
   * @param name - Radio button group name
   * @param mode - Mode value for the section
   * @param label - Display label for the section
   * @returns HTML element for a single count section
   */
  private _createCountSection(
    name: string,
    mode: string,
    label: string
  ): HTMLElement {
    return createEl('section', {
      class: ['count', 'switching'],
      dataset: { mode },
      children: [
        createEl('label', {
          children: [
            createEl('input', {
              attrs: {
                type: 'radio',
                name,
                value: mode,
              },
            }),
            createEl('span', { text: label }),
          ],
        }),
        createEl('div', {
          class: 'input',
          children: [
            createEl('input', {
              class: 'from',
              attrs: {
                min: '0',
                step: '1',
                type: 'number',
              },
            }),
            ' ~ ',
            createEl('input', {
              class: 'to',
              attrs: {
                min: '0',
                step: '1',
                type: 'number',
              },
            }),
          ],
        }),
      ],
    });
  }

  /**
   * Creates the filtered checkbox section
   * @returns HTML element for the filtered section
   */
  private _createFilteredSection(): HTMLElement {
    return createEl('section', {
      class: 'filtered',
      children: [
        createEl('label', {
          children: [
            createEl('input', {
              attrs: {
                type: 'checkbox',
                checked: 'checked',
              },
            }),
            createEl('span', { text: 'Exclude filtered out variants' }),
          ],
        }),
      ],
    });
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
    rangeSlider.addEventListener('range-changed', ((e: CustomEvent) => {
      e.stopPropagation();
      this.changeParameter(e.detail);
    }) as EventListener);

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
        this._conditionType === 'genotype' ? MODE.alt_alt : MODE.frequency;
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
    if (currentCondition && key in currentCondition) {
      currentCondition[key] = Number(target.value) || null;
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

    if (newCondition.from !== undefined) {
      this._condition.frequency.from = newCondition.from;
    }
    if (newCondition.to !== undefined) {
      this._condition.frequency.to = newCondition.to;
    }
    if (newCondition.invert !== undefined) {
      this._condition.frequency.invert = newCondition.invert;
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
      if (this._mode === MODE.frequency) {
        this._condition[this._mode] = this._lastValue as ConditionFrequency;
      } else {
        this._condition[this._mode] = this._lastValue as ConditionCount;
      }
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
    const viewWithShadow = view as Element & { shadowRoot?: ShadowRoot };
    const shadowRoot = viewWithShadow.shadowRoot;
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
      this._conditionType as 'dataset' | 'genotype',
      this._mode,
      currentCondition.from ?? 0,
      currentCondition.to ?? 0,
      invertValue,
      isFiltered
    );

    freqCountView.mode = this._mode;
    freqCountView.from = currentCondition.from ?? 0;
    // Note: Removed .update() call as it's protected and may not be needed externally
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
