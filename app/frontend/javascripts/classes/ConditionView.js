import ConditionValues from './ConditionValues.js';
import {ADVANCED_CONDITIONS} from '../global.js';

export default class ConditionView {

  constructor(delegate, parent, parentNode, type) {

    this._conditionType = type;
    this._parent = parent;

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
    const summary = body.querySelector(':scope > .summary');
    this._values = summary.querySelector(':scope > .values');
    this._editor = body.querySelector(':scope > .advanced-search-condition-editor-view');

    // events
    summary.querySelector(':scope > .editbutton').addEventListener('click', () => this._elm.classList.add('-editing'));

    new ConditionValues(this);
  }


  // public methods

  doneEditing() {
    this._elm.classList.remove('-editing');
  }

  remove() {
    this._parent.removeCondition(this);
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

  get elm() {
    return this._elm;
  }

}