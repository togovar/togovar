import RangeSelectorView from "./RangeSelectorView.js";
import {CONDITION_TYPE} from '../definition.js';

let id = 0;
const DEFAULT_CONDITION = {
  from: 0, to: 1, invert: '0'
};

export default class ConditionValueEditorFrequencyCount {

  constructor(valuesView, conditionType) {
    console.log(valuesView, conditionType)

    this._valuesView = valuesView;
    this._conditionType = conditionType;
    const name = `ConditionValueEditorFrequencyCount${id++}`;

    // HTML
    const section = document.createElement('section');
    section.classList.add('frequency-count-editor-view');
    section.innerHTML = `
      <header>Select ${conditionType}</header>
      <div class="body">
        <section class="frequency">
          <label>
            <input type="radio" name="${name}">
            <span>Frequency<span>
          </label>
          <div class="range-selector-view"></div>
        </section>
        <section class="count">
          <label>
            <input type="radio" name="${name}">
            <span>Count<span>
          </label>
        </section>
      </div>`;
    valuesView.sections.append(section);
    this._body = section.querySelector(':scope > .body');

    const rangeSelectorView = section.querySelector('.range-selector-view');
    this._rangeSelectorView = new RangeSelectorView(rangeSelectorView, this, 0, 1, 'horizontal', 'advanced');
    this._rangeSelectorView.updateGUIWithCondition(DEFAULT_CONDITION);


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
