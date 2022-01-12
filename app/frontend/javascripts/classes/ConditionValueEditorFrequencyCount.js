import ConditionValueEditor from "./ConditionValueEditor.js";
import RangeSelectorView from "./RangeSelectorView.js";
import FrequencyCountValueView from "./FrequencyCountValueView.js";

let id = 0;
const DEFAULT_CONDITION = {
  frequency: {
    from: 0, to: 1, invert: '0'
  },
  count: {
    from: null, to: null
  }
};
const MODE = {
  frequency: 'frequency',
  count: 'count'
}

export default class ConditionValueEditorFrequencyCount extends ConditionValueEditor {

  constructor(valuesView, conditionType) {

    super(valuesView, conditionType);

    this._condition = {
      frequency: Object.assign({}, DEFAULT_CONDITION.frequency),
      count: Object.assign({}, DEFAULT_CONDITION.count)
    };
    // this._condition = Object.assign({}, DEFAULT_CONDITION.frequency);
    this._mode = MODE.frequency;
    const name = `ConditionValueEditorFrequencyCount${id++}`;

    // HTML
    const section = document.createElement('section');
    section.classList.add('frequency-count-editor-view');
    section.innerHTML = `
      <header>Select ${conditionType}</header>
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
      </div>`;
    valuesView.sections.append(section);
    const body = section.querySelector(':scope > .body');

    // set range selector
    const rangeSelectorView = section.querySelector('.range-selector-view');
    this._rangeSelectorView = new RangeSelectorView(rangeSelectorView, this, 0, 1, 'horizontal', 'advanced');
    this._rangeSelectorView.updateGUIWithCondition(this._condition.frequency);

    const switchingElements = body.querySelectorAll(':scope > .switching');
    // events: switch mode
    for (const el of switchingElements) {
      const input = el.querySelector(':scope > label > input');
      input.addEventListener('change', e => {
        for (const el of switchingElements) {
          if (el.dataset.mode === e.target.value) el.classList.add('-current');
          else el.classList.remove('-current');
        }
        this._mode = e.target.value;
        this._update();
      });
      if (input.value === MODE.frequency) {
        requestAnimationFrame(() => {
          input.dispatchEvent(new Event('change'));
          input.checked = true;
        });
      }
    }
    // event: count
    Array.from(switchingElements).find(el => el.classList.contains('count')).querySelectorAll(':scope > .input > input').forEach(input => input.addEventListener('change', e => {
      this._condition.count[e.target.className] = e.target.value;
      this._update();
    }));
    // event: filtered
    this._filtered = body.querySelector(':scope > .filtered > label > input');
    this._filtered.addEventListener('change', () => {
      this._update();
    });
    this._filtered.dispatchEvent(new Event('change'));

    //this._update();
  }


  // public methods

  changeParameter(newCondition) {
    if (!this._rangeSelectorView) return;
    for (const key in newCondition) {
      this._condition.frequency[key] = newCondition[key];
    }
    this._rangeSelectorView.updateGUIWithCondition(newCondition);
    this._update();
  }

  keepLastValues() {
    this._lastValue = this._condition[this._mode];
  }

  restore() {
    this._condition[this._mode] = this._lastValue;
    this._update();
  }

  search() {
    this._update();
  }

  get isValid() {
    return this._validate();
  }


  // private methods

  _update() {

    console.log(this)

    const valuesElement = this._valuesView.conditionView.valuesElement;
    let frequencyCountValueView = valuesElement.querySelector(':scope > .frequency-count-value-view');

    // make view
    if (!frequencyCountValueView) {
      frequencyCountValueView = document.createElement('div');
      frequencyCountValueView.classList.add('frequency-count-value-view');
      frequencyCountValueView.innerHTML = `
      <div class="frequencygraph">
        <div class="bar -bar1"></div>
        <div class="bar -bar2"></div>
      </div>
      <div class="range">
        <span class="from"></span> ~ <span class="to"></span>
      </div>
      <p class="filtered">Exclude filtered out variants</p>
      `
      valuesElement.append(frequencyCountValueView);
      this._fcvvBar1 = frequencyCountValueView.querySelector(':scope > .frequencygraph > .bar.-bar1');
      this._fcvvBar2 = frequencyCountValueView.querySelector(':scope > .frequencygraph > .bar.-bar2');
      this._fcvvFrom = frequencyCountValueView.querySelector(':scope > .range > .from');
      this._fcvvTo = frequencyCountValueView.querySelector(':scope > .range > .to');
    }

    // set value
    frequencyCountValueView.dataset.mode = this._mode;
    frequencyCountValueView.dataset.from = this._condition[this._mode].from ?? '';
    frequencyCountValueView.dataset.to = this._condition[this._mode].to ?? '';
    frequencyCountValueView.dataset.invert = this._condition[this._mode].invert ?? '';
    frequencyCountValueView.dataset.filtered = this._filtered.checked ? true : false;
    // update value
    if (this._mode === MODE.frequency) {
      if (this._condition[this._mode].invert === '0') {
        this._fcvvBar1.style.left = this._condition[this._mode].from * 100 + '%';
        this._fcvvBar1.style.width = (this._condition[this._mode].to - this._condition[this._mode].from) * 100 + '%';
        this._fcvvBar2.style.width = '0%';
      } else {
        this._fcvvBar1.style.left = '0%';
        this._fcvvBar1.style.width = this._condition[this._mode].from * 100 + '%';
        this._fcvvBar2.style.left = this._condition[this._mode].to * 100 + '%';
        this._fcvvBar2.style.width = (1 - this._condition[this._mode].to) * 100 + '%';
      }
    }
    this._fcvvFrom.textContent = this._condition[this._mode].from;
    this._fcvvTo.textContent = this._condition[this._mode].to;

    // validation
    this._valuesView.update(this._validate());
  }

  _validate() {
    Object.keys(this._condition[this._mode]).some(key => {
      return this._condition[this._mode][key] !== null;
    })
    return Object.keys(this._condition[this._mode]).some(key => this._condition[this._mode][key] !== null);
  }

}
