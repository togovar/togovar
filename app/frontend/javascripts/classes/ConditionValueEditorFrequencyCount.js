import RangeSelectorView from "./RangeSelectorView.js";
import {CONDITION_TYPE} from '../definition.js';

let id = 0;

export default class ConditionValueEditorFrequencyCount {

  constructor(valuesView, conditionType) {
    console.log(valuesView, conditionType)

    this._valuesView = valuesView;
    this._conditionType = conditionType;
    const name = `ConditionValueEditorFrequencyCount${id++}`;

    // HTML
    const section = document.createElement('section');
    section.classList.add('text-field-editor-view');
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
    this._rangeSelectorViews = new RangeSelectorView(rangeSelectorView, this, 0, 1, 'horizontal', 'advanced');
    console.log(this._rangeSelectorViews)


  }


  // public methods

  changeParameter(newCondition, dataset) {
    console.log(newCondition, dataset)
    console.log(this._rangeSelectorViews)
    this._rangeSelectorViews.updateGUIWithCondition(newCondition);
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
