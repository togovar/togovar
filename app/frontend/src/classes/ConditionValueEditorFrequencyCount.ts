import ConditionValueEditor from './ConditionValueEditor.js';
import '../components/RangeSliderView.js';

interface ConditionFrequency {
  from: number;
  to: number;
  invert: string;
}

interface ConditionCount {
  from: number | null;
  to: number | null;
}

interface Condition {
  frequency: ConditionFrequency;
  count: ConditionCount;
}

let id: number = 0;
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
const MODE = {
  frequency: 'frequency',
  count: 'count',
} as const;

type ModeType = (typeof MODE)[keyof typeof MODE];

export default class ConditionValueEditorFrequencyCount extends ConditionValueEditor {
  private _condition: Condition;
  private _mode: ModeType;
  private _rangeSelectorView: any;
  private _filtered: HTMLInputElement;
  private _lastValue: any;

  /**
   * @param {ConditionValues} valuesView
   * @param {ConditionItemView} conditionView */
  constructor(valuesView: any, conditionView: any) {
    super(valuesView, conditionView);

    this._condition = {
      frequency: Object.assign({}, DEFAULT_CONDITION.frequency),
      count: Object.assign({}, DEFAULT_CONDITION.count),
    };
    // this._condition = Object.assign({}, DEFAULT_CONDITION.frequency);
    this._mode = MODE.frequency;
    const name = `ConditionValueEditorFrequencyCount${id++}`;

    // HTML
    this._createElement(
      'frequency-count-editor-view',
      `
    <header>Specify range</header>
    <div class="body">
      <section class="frequency switching" data-mode="${MODE.frequency}">
        <label>
          <input type="radio" name="${name}" value="${MODE.frequency}">
          <span>Frequency<span>
        </label>
        <div class="range-selector-view input"></div>
      </section>
      <section class="count switching" data-mode="${MODE.count}">
        <label>
          <input type="radio" name="${name}" value="${MODE.count}">
          <span>Count<span>
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
          <span>Exclude filtered out variants<span>
        </label>
      </section>
    </div>`
    );

    // set range selector
    const rangeSlider = document.createElement('range-slider') as any;
    rangeSlider.searchType = 'advanced';
    rangeSlider.sliderStep = 0.01;
    rangeSlider.inputStep = 0.05;
    rangeSlider.addEventListener('range-changed', (e: any) => {
      e.stopPropagation();
      this.changeParameter(e.detail);
    });

    this._el.querySelector('.range-selector-view').appendChild(rangeSlider);

    this._rangeSelectorView = rangeSlider;

    const switchingElements = this._body.querySelectorAll(
      ':scope > .switching'
    );
    // events: switch mode
    for (const el of switchingElements) {
      const input = el.querySelector(':scope > label > input');
      input.addEventListener('change', (e) => {
        for (const el of switchingElements) {
          const target = e.target as HTMLInputElement;
          if ((el as HTMLElement).dataset.mode === target.value)
            (el as HTMLElement).classList.add('-current');
          else (el as HTMLElement).classList.remove('-current');
        }
        const target = e.target as HTMLInputElement;
        this._mode = target.value as ModeType;
        this._update();
      });
      if ((input as HTMLInputElement).value === MODE.frequency) {
        requestAnimationFrame(() => {
          input.dispatchEvent(new Event('change'));
          (input as HTMLInputElement).checked = true;
        });
      }
    }
    // event: count
    Array.from(switchingElements)
      .find((el) => el.classList.contains('count'))
      .querySelectorAll(':scope > .input > input')
      .forEach((input) =>
        input.addEventListener('change', (e) => {
          this._condition.count[(e.target as HTMLInputElement).className] =
            Number((e.target as HTMLInputElement).value);
          this._update();
        })
      );
    // event: filtered
    this._filtered = this._body.querySelector(
      ':scope > .filtered > label > input'
    );
    this._filtered.addEventListener('change', () => {
      this._update();
    });
    this._filtered.dispatchEvent(new Event('change'));

    // observe valuesView
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(() => this._update());
    });
    observer.observe(this._valuesElement, {
      attributes: false,
      childList: true,
      subtree: false,
    });

    // this._update();
  }

  // public methods

  changeParameter(newCondition: Partial<ConditionFrequency>): void {
    if (!this._rangeSelectorView) return;
    for (const key in newCondition) {
      (this._condition.frequency as any)[key] = (newCondition as any)[key];
    }
    this._update();
  }

  keepLastValues(): void {
    this._lastValue = this._condition[this._mode];
  }

  restore(): void {
    this._condition[this._mode] = this._lastValue;
    this._update();
  }

  search(): void {
    this._update();
  }

  get isValid(): boolean {
    return this._validate();
  }

  // private methods

  private _update(): void {
    this._statsApplyToFreqCountViews();
    // validation
    this._valuesView.update(this._validate());
  }

  private _statsApplyToFreqCountViews(): void {
    this._valuesElement
      .querySelectorAll(':scope > condition-item-value-view')
      .forEach((view) => {
        const freqCountView = view.shadowRoot.querySelector(
          'frequency-count-value-view'
        ) as any;
        if (!freqCountView || typeof freqCountView.setValues !== 'function')
          return;
        freqCountView.setValues(
          this._mode,
          this._condition[this._mode].from ?? '',
          this._condition[this._mode].to ?? '',
          this._mode === MODE.frequency
            ? this._condition.frequency.invert ?? ''
            : '',
          this._filtered.checked ? true : false
        );
        freqCountView.mode = this._mode;
        freqCountView.from = this._condition[this._mode].from ?? '';
        // freqCountView.top = this._condition[this._mode].top ?? '';
        freqCountView.update();
      });
  }

  private _validate(): boolean {
    return Object.keys(this._condition[this._mode]).some(
      (key) => (this._condition[this._mode] as any)[key] !== null
    );
  }
}
