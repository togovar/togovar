import ConditionValueEditor from './ConditionValueEditor.js';
import '../components/RangeSliderView.js';

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
}

/**
 * Interface for range selector custom element
 */
interface RangeSliderElement extends HTMLElement {
  searchType: string;
  sliderStep: number;
  inputStep: number;
}

/**
 * Interface for frequency count view custom element
 */
interface FrequencyCountViewElement extends Element {
  setValues(
    mode: string,
    from: string | number,
    to: string | number,
    invert: string,
    filtered: boolean
  ): void;
  mode: string;
  from: string | number;
  update(): void;
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
};

/**
 * Available modes for the condition editor
 */
const MODE = {
  frequency: 'frequency',
  count: 'count',
} as const;

type ModeType = (typeof MODE)[keyof typeof MODE];

/**
 * Condition value editor for frequency and count filtering
 * Provides UI controls for setting frequency ranges and count ranges for variant filtering
 */
export default class ConditionValueEditorFrequencyCount extends ConditionValueEditor {
  #condition: Condition;
  #mode: ModeType;
  #rangeSelectorView: RangeSliderElement | null = null;
  #filtered: HTMLInputElement | null = null;
  #lastValue: ConditionFrequency | ConditionCount | null = null;

  /**
   * Creates a new frequency/count condition editor
   * @param valuesView - The parent values view component
   * @param conditionView - The parent condition view component
   */
  constructor(valuesView: any, conditionView: any) {
    super(valuesView, conditionView);

    this.#condition = {
      frequency: Object.assign({}, DEFAULT_CONDITION.frequency),
      count: Object.assign({}, DEFAULT_CONDITION.count),
    };
    this.#mode = MODE.frequency;

    this.#initializeComponent();
    this.#setupEventListeners();
    this.#observeValueChanges();
  }

  /**
   * Initializes the component's HTML structure
   */
  #initializeComponent(): void {
    const name = `ConditionValueEditorFrequencyCount${id++}`;

    this._createElement(
      'frequency-count-editor-view',
      this.#generateHTML(name)
    );

    this.#setupRangeSlider();
  }

  /**
   * Generates the HTML template for the component
   * @param name - Unique name for radio button grouping
   * @returns HTML string template
   */
  #generateHTML(name: string): string {
    return `
    <header>Specify range</header>
    <div class="body">
      <section class="frequency switching" data-mode="${MODE.frequency}">
        <label>
          <input type="radio" name="${name}" value="${MODE.frequency}">
          <span>Frequency</span>
        </label>
        <div class="range-selector-view input"></div>
      </section>
      <section class="count switching" data-mode="${MODE.count}">
        <label>
          <input type="radio" name="${name}" value="${MODE.count}">
          <span>Count</span>
        </label>
        <div class="input">
          <input class="from" min="0" step="1" type="number">
          ~
          <input class="to" min="0" step="1" type="number">
        </div>
      </section>
      <section class="filtered">
        <label>
          <input type="checkbox" checked>
          <span>Exclude filtered out variants</span>
        </label>
      </section>
    </div>`;
  }

  /**
   * Sets up the range slider component
   */
  #setupRangeSlider(): void {
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

    const container = this._el.querySelector('.range-selector-view');
    if (container) {
      container.appendChild(rangeSlider);
    }

    this.#rangeSelectorView = rangeSlider;
  }

  /**
   * Sets up all event listeners for the component
   */
  #setupEventListeners(): void {
    this.#setupModeToggleListeners();
    this.#setupCountInputListeners();
    this.#setupFilteredCheckboxListener();
  }

  /**
   * Sets up event listeners for mode toggle radio buttons
   */
  #setupModeToggleListeners(): void {
    const switchingElements = this._body.querySelectorAll(
      ':scope > .switching'
    );

    for (const el of switchingElements) {
      const input = el.querySelector(
        ':scope > label > input'
      ) as HTMLInputElement;
      if (!input) continue;

      input.addEventListener('change', (e) => {
        this.#handleModeChange(e, switchingElements);
      });

      if (input.value === MODE.frequency) {
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
  #handleModeChange(e: Event, switchingElements: NodeListOf<Element>): void {
    const target = e.target as HTMLInputElement;

    for (const el of switchingElements) {
      const htmlEl = el as HTMLElement;
      if (htmlEl.dataset.mode === target.value) {
        htmlEl.classList.add('-current');
      } else {
        htmlEl.classList.remove('-current');
      }
    }

    this.#mode = target.value as ModeType;
    this.#update();
  }

  /**
   * Sets up event listeners for count input fields
   */
  #setupCountInputListeners(): void {
    const switchingElements = this._body.querySelectorAll(
      ':scope > .switching'
    );
    const countElement = Array.from(switchingElements).find((el) =>
      el.classList.contains('count')
    );

    if (countElement) {
      const inputs = countElement.querySelectorAll(':scope > .input > input');
      inputs.forEach((input) => {
        input.addEventListener('change', (e) => {
          this.#handleCountInputChange(e);
        });
      });
    }
  }

  /**
   * Handles count input change events
   * @param e - Change event from count input
   */
  #handleCountInputChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    const key = target.className as keyof ConditionCount;
    (this.#condition.count as any)[key] = Number(target.value);
    this.#update();
  }

  /**
   * Sets up event listener for filtered checkbox
   */
  #setupFilteredCheckboxListener(): void {
    this.#filtered = this._body.querySelector(
      ':scope > .filtered > label > input'
    );
    if (this.#filtered) {
      this.#filtered.addEventListener('change', () => {
        this.#update();
      });
      this.#filtered.dispatchEvent(new Event('change'));
    }
  }

  /**
   * Sets up mutation observer for values view changes
   */
  #observeValueChanges(): void {
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(() => this.#update());
    });
    observer.observe(this._valuesElement, {
      attributes: false,
      childList: true,
      subtree: false,
    });
  }

  /**
   * Updates the condition parameters based on range slider changes
   * @param newCondition - New condition values from range slider
   */
  changeParameter(newCondition: Partial<ConditionFrequency>): void {
    if (!this.#rangeSelectorView) return;

    for (const key in newCondition) {
      if (key in this.#condition.frequency) {
        (this.#condition.frequency as any)[key] = (newCondition as any)[key];
      }
    }
    this.#update();
  }

  /**
   * Stores the current values for potential restoration
   */
  keepLastValues(): void {
    this.#lastValue = { ...this.#condition[this.#mode] };
  }

  /**
   * Restores previously stored values
   */
  restore(): void {
    if (this.#lastValue) {
      if (this.#mode === MODE.frequency && this.#lastValue) {
        this.#condition.frequency = this.#lastValue as ConditionFrequency;
      } else if (this.#mode === MODE.count && this.#lastValue) {
        this.#condition.count = this.#lastValue as ConditionCount;
      }
      this.#update();
    }
  }

  /**
   * Triggers a search operation
   */
  search(): void {
    this.#update();
  }

  /**
   * Gets the validation state of the current condition
   * @returns True if the condition is valid
   */
  get isValid(): boolean {
    return this.#validate();
  }

  /**
   * Updates the component state and validates conditions
   */
  #update(): void {
    this.#statsApplyToFreqCountViews();
    this._valuesView.update(this.#validate());
  }

  /**
   * Applies current condition values to frequency count views
   */
  #statsApplyToFreqCountViews(): void {
    this._valuesElement
      .querySelectorAll(':scope > condition-item-value-view')
      .forEach((view) => {
        const freqCountView = this.#getFrequencyCountView(view);
        if (!freqCountView) return;

        this.#updateFrequencyCountView(freqCountView);
      });
  }

  /**
   * Gets the frequency count view from a condition item value view
   * @param view - Parent view element
   * @returns Frequency count view element or null
   */
  #getFrequencyCountView(view: Element): FrequencyCountViewElement | null {
    const shadowRoot = (view as any).shadowRoot;
    if (!shadowRoot) return null;

    const freqCountView = shadowRoot.querySelector(
      'frequency-count-value-view'
    ) as FrequencyCountViewElement;
    return freqCountView && typeof freqCountView.setValues === 'function'
      ? freqCountView
      : null;
  }

  /**
   * Updates a frequency count view with current condition values
   * @param freqCountView - The frequency count view to update
   */
  #updateFrequencyCountView(freqCountView: FrequencyCountViewElement): void {
    const currentCondition = this.#condition[this.#mode];
    const invertValue =
      this.#mode === MODE.frequency ? this.#condition.frequency.invert : '';
    const isFiltered = this.#filtered?.checked ?? false;

    freqCountView.setValues(
      this.#mode,
      currentCondition.from ?? '',
      currentCondition.to ?? '',
      invertValue,
      isFiltered
    );

    freqCountView.mode = this.#mode;
    freqCountView.from = currentCondition.from ?? '';
    freqCountView.update();
  }

  /**
   * Validates the current condition
   * @returns True if any condition value is not null
   * @private
   */
  #validate(): boolean {
    const currentCondition = this.#condition[this.#mode];
    return Object.values(currentCondition).some((value) => value !== null);
  }
}
