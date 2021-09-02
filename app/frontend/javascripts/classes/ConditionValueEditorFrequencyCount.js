import SearchFieldView from './SearchFieldView.js';
import {CONDITION_TYPE} from '../definition.js';

export default class ConditionValueEditorFrequencyCount {

  constructor(valuesView, conditionType) {
    console.log(valuesView, conditionType)

    this._valuesView = valuesView;
    this._conditionType = conditionType;

    // HTML
    const section = document.createElement('section');
    section.classList.add('text-field-editor-view');
    section.innerHTML = `
      <header>Select ${conditionType}</header>
      <div class="body"></div>`;
    valuesView.sections.append(section);
    this._body = section.querySelector(':scope > .body');
  }


  // public methods

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
