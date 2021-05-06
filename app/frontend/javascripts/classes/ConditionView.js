import ConditionValues from './ConditionValues.js';
import {ADVANCED_CONDITIONS} from '../global.js';

export default class ConditionView {

  constructor(delegate, parentNode, type) {

    this._conditionType = type;

    // make HTML
    this._elm = document.createElement('div');
    this._elm.classList.add('advanced-search-condition-view');
    this._elm.classList.add('-editing');
    this._elm.dataset.classification = type;
    this._elm.dataset.operator = 'equal';
    this._elm.innerHTML = `
    <div class="body">
      <div class="summary">
        <div class="classification">${ADVANCED_CONDITIONS[type].label}</div>
        <div class="operator"></div>
        <div class="values"></div>
        <div class="editbutton">Edit</div>
      </div>
      <div class="advanced-search-condition-editor-view"></div>
    </div>
    <div class="bg"></div>`;
    parentNode.insertAdjacentElement('beforeend', this._elm);

    // reference
    this._delegate = delegate;
    const body = this._elm.querySelector(':scope > .body');
    this._values = body.querySelector(':scope > .summary > .values');
    this._editor = body.querySelector(':scope > .advanced-search-condition-editor-view');

    new ConditionValues(this);
  }

  // accessor

  get type() {
    return this._conditionType;
  }

  get valuesElement() {
    return this._values;
  }

  get editorElement() {
    return this._editor;
  }

}