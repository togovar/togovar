import RangeSelectorView from "./RangeSelectorView.js";
import {CONDITION_TYPE} from '../definition.js';

let id = 0;
const DEFAULT_CONDITION = {
  from: 0, to: 1, invert: '0'
};
const MODE = {
  frequency: 'frequency',
  count: 'count'
}

export default class ConditionValueEditorFrequencyCount {

  constructor(valuesView, conditionType) {
    console.log(valuesView, conditionType)

    this._valuesView = valuesView;
    this._conditionType = conditionType;
    this._mode = MODE.FREQUENCY;
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
        <section>
          <label>
            <input type="checkbox">
            <span>Exclude filtered out variants<span>
          </label>
        </section>
      </div>`;
    valuesView.sections.append(section);
    this._body = section.querySelector(':scope > .body');

    // set range selector
    const rangeSelectorView = section.querySelector('.range-selector-view');
    this._rangeSelectorView = new RangeSelectorView(rangeSelectorView, this, 0, 1, 'horizontal', 'advanced');
    this._rangeSelectorView.updateGUIWithCondition(DEFAULT_CONDITION);

    // events: switch mode
    const switchingElements = section.querySelectorAll(':scope > .body > .switching');
    for (const el of switchingElements) {
      const input = el.querySelector(':scope > label > input');
      input.addEventListener('change', e => {
        for (const el of switchingElements) {
          if (el.dataset.mode === e.target.value) el.classList.add('-current');
          else el.classList.remove('-current');
        }
        this._mode = e.target.value;
      });
      if (input.value === MODE.frequency) {
        requestAnimationFrame(() => {
          input.dispatchEvent(new Event('change'));
          input.checked = true;
        });
      }
    }

  }


  // public methods

  changeParameter(newCondition, dataset) {
    if (!this._rangeSelectorView) return;
    console.log(newCondition, dataset)
    this._rangeSelectorView.updateGUIWithCondition(newCondition);
  }

  keepLastValues() {
    // this._lastValue = this._searchFieldView.value;
  }

  restore() {
    // this._searchFieldView.setTerm(this._lastValue);
    this._update();
  }

  search() {
    this._update();
  }


  // private methods

  _update() {

    // update value
    // const term = this._searchFieldView.value;
    const valuesElement = this._valuesView.conditionView.valuesElement;
    // valuesElement.innerHTML = `<span class="value" data-value="${term}">${term}</span>`;

    // validation
    this._valuesView.update(this._validate());
  }

  _validate() {
    // return this._searchFieldView.value !== '';
  }

}
