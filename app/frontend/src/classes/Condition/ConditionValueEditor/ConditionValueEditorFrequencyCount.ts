import { createEl } from '../../../utils/dom/createEl';
import { selectOrNull } from '../../../utils/dom/select';
import type { ConditionItemView } from '../ConditionItemView';
import { ConditionValueEditor } from './ConditionValueEditor';
import type ConditionValues from '../ConditionValues';
import '../../../components/RangeSliderView.js';
import {
  MODE,
  type FrequencyCountValueView,
} from '../../../components/FrequencyCountValueView';

export type RangeSliderData = {
  from?: number;
  to?: number;
  invert?: boolean;
};

type ModeType = (typeof MODE)[keyof typeof MODE];
type CountMode = Exclude<ModeType, 'frequency'>;

type ConditionState = {
  frequency: FrequencyCondition;
} & CountBuckets;
type CountBuckets = Record<CountMode, CountCondition>;

export interface FrequencyCondition {
  from: number;
  to: number;
  invert: boolean;
}

interface CountCondition {
  from: number | null;
  to: number | null;
}

// Interface for range selector custom element
interface RangeSliderElement extends HTMLElement {
  searchType: string;
  sliderStep: number;
  inputStep: number;
}

const SELECTORS = {
  SWITCHING: ':scope > .switching',
  FREQUENCY_COUNT_VIEW: 'frequency-count-value-view',
  RANGE_SELECTOR: '.range-selector-view',
  RADIO_INPUT: ':scope > label > input',
  FILTERED_CHECKBOX: ':scope > .filtered > label > input',
} as const;

/**
 * ConditionState value editor for frequency and count filtering
 * Provides UI controls for setting frequency ranges and count ranges for variant filtering
 */
export class ConditionValueEditorFrequencyCount extends ConditionValueEditor {
  _condition: ConditionState;
  _mode: ModeType;
  _rangeSelectorView: RangeSliderElement | null = null;
  _filtered: HTMLInputElement | null = null;
  _lastValue: FrequencyCondition | CountCondition | null = null;
  private static _idCounter = 0;
  private static readonly DEFAULT_CONDITION: ConditionState = {
    frequency: { from: 0, to: 1, invert: false },
    count: { from: null, to: null },
    aac: { from: null, to: null },
    arc: { from: null, to: null },
    hac: { from: null, to: null },
  };
  private readonly _radioGroupName = `freqcount-${ConditionValueEditorFrequencyCount._idCounter++}`;

  /**
   * Creates a new frequency/count condition editor
   * @param valuesView - The parent values view component
   * @param conditionView - The parent condition view component
   */
  constructor(valuesView: ConditionValues, conditionView: ConditionItemView) {
    super(valuesView, conditionView);

    this._condition = {
      frequency: {
        ...ConditionValueEditorFrequencyCount.DEFAULT_CONDITION.frequency,
      },
      count: { ...ConditionValueEditorFrequencyCount.DEFAULT_CONDITION.count },
      aac: {
        ...ConditionValueEditorFrequencyCount.DEFAULT_CONDITION.aac,
      },
      arc: {
        ...ConditionValueEditorFrequencyCount.DEFAULT_CONDITION.arc,
      },
      hac: {
        ...ConditionValueEditorFrequencyCount.DEFAULT_CONDITION.hac,
      },
    };
    this._mode =
      this.conditionType === 'genotype' ? MODE.alt_alt : MODE.frequency;

    this._initializeComponent();
    this._setupEventListeners();
    this._observeValueChanges();
    this._updateErrorMessageVisibility();

    // Set initial classification text based on default mode
    this.conditionItemView.updateClassificationText(
      this._getModeDisplayText(this._mode)
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────────
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
        this._condition[this._mode] = this._lastValue as FrequencyCondition;
      } else {
        this._condition[this._mode] = this._lastValue as CountCondition;
      }
      this._update();
    }
  }

  /**
   * Gets the validation state of the current condition
   * Validates that:
   * - At least one value (from or to) is not null
   * - For count modes: from is not greater than to
   * @returns True if the condition is valid
   */
  get isValid(): boolean {
    const currentCondition = this._condition[this._mode];
    if (!currentCondition) {
      return false;
    }

    // Check if at least one value is not null
    const hasValue = Object.values(currentCondition).some(
      (value) => value !== null
    );
    if (!hasValue) {
      return false;
    }

    // For count modes, validate that from <= to
    if (this._mode !== MODE.frequency) {
      const countCondition = currentCondition as CountCondition;
      if (
        countCondition.from !== null &&
        countCondition.to !== null &&
        countCondition.from > countCondition.to
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Observes changes in the values view and triggers updates
   */
  private _observeValueChanges(): void {
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(() => this._update());
    });
    observer.observe(this.valuesContainerEl, {
      attributes: false,
      childList: true,
      subtree: false,
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DOM Generation
  // ───────────────────────────────────────────────────────────────────────────
  /** Initializes the component's HTML structure */
  private _initializeComponent(): void {
    this.createSectionEl('frequency-count-editor-view', () => [
      createEl('header', { text: 'Specify range' }),
      createEl('div', {
        class: 'body',
        children: this._createBodyElements(this._radioGroupName),
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
    if (this.conditionType === 'genotype') {
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
    const shouldShowError =
      mode === this._mode && this._isCurrentConditionInvalid();

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
          class: 'input-container',
          children: [
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
            createEl('div', {
              class: ['messages-view', ...(shouldShowError ? [] : ['-hidden'])],
              children: [
                createEl('div', {
                  class: ['message', '-error'],
                  text: 'The maximum and minimum values are invalid.',
                }),
              ],
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
    const filteredCheckboxId = `${this._radioGroupName}-filtered`;

    return createEl('section', {
      class: 'filtered',
      children: [
        createEl('label', {
          attrs: {
            for: filteredCheckboxId,
          },
          children: [
            createEl('input', {
              attrs: {
                type: 'checkbox',
                checked: 'checked',
                id: filteredCheckboxId,
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
    const rangeSlider = createEl('range-slider', {
      domProps: {
        searchType: 'advanced',
        sliderStep: 0.01,
        inputStep: 0.05,
      },
      attrs: {
        value1: this._condition.frequency.from.toString(),
        value2: this._condition.frequency.to.toString(),
        invert: this._condition.frequency.invert.toString(), // "true" or "false"
      },
    });

    // Listen for changes from the range slider and update condition
    rangeSlider.addEventListener(
      'range-changed',
      (e: CustomEvent<RangeSliderData>) => {
        e.stopPropagation();
        this.changeParameter(e.detail);
      }
    );

    const rangeContainer = selectOrNull<HTMLElement>(
      this.sectionEl,
      SELECTORS.RANGE_SELECTOR
    );
    rangeContainer?.appendChild(rangeSlider);
    this._rangeSelectorView = rangeSlider;

    // Force initial state sync after DOM insertion
    requestAnimationFrame(() => {
      if (this._rangeSelectorView) {
        // Ensure the checkbox reflects the current state
        const shadowHost = this._rangeSelectorView as HTMLElement & {
          shadowRoot?: ShadowRoot;
        };
        if (shadowHost.shadowRoot) {
          const checkboxInShadow = selectOrNull<HTMLInputElement>(
            shadowHost.shadowRoot,
            '.invert'
          );
          if (checkboxInShadow) {
            checkboxInShadow.checked = this._condition.frequency.invert;
          }
        }
      }
    });
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
    const switchingElements = this.bodyEl.querySelectorAll(SELECTORS.SWITCHING);

    for (const el of switchingElements) {
      const input = selectOrNull<HTMLInputElement>(el, SELECTORS.RADIO_INPUT);
      if (!input) continue;

      input.addEventListener('change', (e) => {
        this._handleModeChange(e, switchingElements);
      });

      // Set default selection based on condition type
      const defaultMode =
        this.conditionType === 'genotype' ? MODE.alt_alt : MODE.frequency;
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

    // Update parent classification text based on selected mode
    this.conditionItemView.updateClassificationText(
      this._getModeDisplayText(this._mode)
    );

    this._updateErrorMessageVisibility();
    this._update();
  }

  /**
   * Sets up event listeners for count input fields
   */
  private _setupCountInputListeners(): void {
    const switchingElements = this.bodyEl.querySelectorAll(SELECTORS.SWITCHING);

    // Set up input listeners for all switching sections
    switchingElements.forEach((element) => {
      const inputs = element.querySelectorAll(':scope .input > input');
      inputs.forEach((input) => {
        input.addEventListener('change', (e) => {
          this._handleCountInputChange(e);
        });
        // Also listen to input event for real-time validation
        input.addEventListener('input', (e) => {
          this._handleCountInputChange(e);
        });
      });
    });
  }

  /**
   * Handles count input change events
   * For count modes (non-frequency), ensures:
   * - Negative values are converted to 0
   * - Decimal values are truncated to integers
   * @param e - Change event from count input
   */
  private _handleCountInputChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    const key = target.className as keyof CountCondition;
    const currentCondition = this._condition[this._mode] as CountCondition;
    if (currentCondition && key in currentCondition) {
      const value = target.value.trim();

      if (value === '') {
        currentCondition[key] = null;
      } else {
        let numValue = Number(value);

        // For count modes (not frequency), enforce integer constraints
        if (this._mode !== MODE.frequency) {
          // Convert negative values to 0
          if (numValue < 0) {
            numValue = 0;
          }
          // Truncate decimal values to integers (floor)
          numValue = Math.floor(numValue);

          // Update the input field to reflect the corrected value
          target.value = numValue.toString();
        }

        currentCondition[key] = numValue;
      }

      this._updateErrorMessageVisibility();
      this._update();
    }
  }

  /**
   * Checks if the current condition has an invalid range (from > to)
   * This is specifically for showing error messages to the user
   * @returns True if the range is invalid (from > to for count modes)
   */
  private _isCurrentConditionInvalid(): boolean {
    // Only validate count modes, not frequency mode
    if (this._mode === MODE.frequency) {
      return false;
    }

    const currentCondition = this._condition[this._mode] as CountCondition;
    return (
      currentCondition.from !== null &&
      currentCondition.to !== null &&
      currentCondition.from > currentCondition.to
    );
  }

  /**
   * Updates error message visibility by re-rendering the section
   */
  private _updateErrorMessageVisibility(): void {
    const isInvalid = this._isCurrentConditionInvalid();

    // Find the current mode's section and update error message visibility
    const currentSection = this.bodyEl.querySelector(
      `[data-mode="${this._mode}"]`
    );
    if (currentSection) {
      const messagesView = currentSection.querySelector(
        '.messages-view'
      ) as HTMLElement;
      if (messagesView) {
        if (isInvalid) {
          messagesView.classList.remove('-hidden');
        } else {
          messagesView.classList.add('-hidden');
        }
      }
    }
  }

  /**
   * Sets up event listener for filtered checkbox
   */
  private _setupFilteredCheckboxListener(): void {
    this._filtered = selectOrNull<HTMLInputElement>(
      this.bodyEl,
      SELECTORS.FILTERED_CHECKBOX
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
  changeParameter(newCondition: RangeSliderData): void {
    if (!this._rangeSelectorView) return;

    if (newCondition.from !== undefined) {
      this._condition.frequency.from = newCondition.from;
    }
    if (newCondition.to !== undefined) {
      this._condition.frequency.to = newCondition.to;
    }
    if (newCondition.invert !== undefined) {
      // Convert string/boolean to boolean for consistent internal state
      this._condition.frequency.invert =
        typeof newCondition.invert === 'string'
          ? newCondition.invert === '1' || newCondition.invert === 'true'
          : Boolean(newCondition.invert);
    }
    this._update();
  }

  /**
   * Updates the component state and validates conditions
   */
  private _update(): void {
    this._applyConditionToAllViews();
    this.conditionValues.update(this.isValid);
  }

  /**
   * Applies current condition values to frequency count views
   */
  private _applyConditionToAllViews(): void {
    this.valuesContainerEl
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

    const freqCountView = selectOrNull<FrequencyCountValueView>(
      shadowRoot,
      SELECTORS.FREQUENCY_COUNT_VIEW
    );
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
      this._mode === MODE.frequency ? this._condition.frequency.invert : false;
    const isFiltered = this._filtered?.checked ?? false;

    // Format frequency values to always show at least one decimal place
    const fromValue =
      this._mode === MODE.frequency
        ? this._formatFrequencyValue(currentCondition.from as number)
        : currentCondition.from;
    const toValue =
      this._mode === MODE.frequency
        ? this._formatFrequencyValue(currentCondition.to as number)
        : currentCondition.to;

    freqCountView.setValues(
      this.conditionType as 'dataset' | 'genotype',
      this._mode,
      fromValue,
      toValue,
      invertValue,
      isFiltered
    );

    freqCountView.mode = this._mode;
    freqCountView.from = fromValue;
    // Note: Removed .update() call as it's protected and may not be needed externally
  }

  /**
   * Formats a frequency value to ensure at least one decimal place is shown (e.g., 0.0, 1.0)
   * @param value - The numeric frequency value
   * @returns Formatted value (number with at least 1 decimal place)
   */
  private _formatFrequencyValue(value: number): number {
    // Round to 2 decimal places to avoid floating point precision issues
    return Math.round(value * 100) / 100;
  }

  /**
   * Gets the display text for classification based on current mode
   * @param mode - The mode to get display text for
   * @returns Display text for classification
   */
  private _getModeDisplayText(mode: ModeType): string {
    const displayTextMap: Record<ModeType, string> = {
      [MODE.frequency]: 'Alternative allele frequency',
      [MODE.count]: 'Alternative allele count',
      [MODE.alt_alt]: 'Genotype count (Alt/Alt)',
      [MODE.alt_ref]: 'Genotype count (Alt/Ref)',
      [MODE.hemi_alt]: 'Genotype count (Hemi_Alt)',
    };

    return displayTextMap[mode];
  }
}
