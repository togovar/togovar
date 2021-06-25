import ConditionView from './ConditionView.js';
import ConditionValues from './ConditionValues.js';
import {ADVANCED_CONDITIONS} from '../global.js';

export default class ConditionItemView extends ConditionView {

  /**
   * 
   * @param {AdvancedSearchBuilderView} builder 
   * @param {*} parent 
   * @param {HTMLElement} parentNode 
   * @param {String} type 
   */
  constructor(builder, parent, parentNode, type) {

    super(builder, parent, parentNode);

    this._conditionType = type;
    this._isFirstTime = true;

    // make HTML
    this._elm.classList.add('advanced-search-condition-item-view');
    this._elm.dataset.classification = type;
    this._elm.dataset.relation = 'eq';
    this._elm.innerHTML = `
    <div class="body">
      <div class="summary">
        <div class="classification">${ADVANCED_CONDITIONS[type].label}</div>
        <div class="relation"></div>
        <div class="values"></div>
        <div class="editbutton">Edit</div>
      </div>
      <div class="advanced-search-condition-editor-view"></div>
    </div>
    <div class="bg"></div>`;

    // reference
    const body = this._elm.querySelector(':scope > .body');
    const summary = body.querySelector(':scope > .summary');
    this._values = summary.querySelector(':scope > .values');
    this._editor = body.querySelector(':scope > .advanced-search-condition-editor-view');
    this._conditionValues = new ConditionValues(this);

    // events
    // this._elm.addEventListener('click', e => e.stopImmediatePropagation());
    // this._elm.addEventListener('mouseup', e => e.stopImmediatePropagation());
    // switch logical operation
    summary.querySelector(':scope > .relation').addEventListener('click', e => {
      e.stopImmediatePropagation();
      // e.preventDefault();
      this._elm.dataset.relation = {eq: 'ne', ne: 'eq'}[this._elm.dataset.relation];
    });
    // switch edit mode
    const editButton = summary.querySelector(':scope > .editbutton');
    editButton.addEventListener('click', e => {
      e.stopImmediatePropagation();
      // e.preventDefault();
      this._elm.classList.add('-editing');
      this._conditionValues.start();
    });
    editButton.dispatchEvent(new Event('click'));
  }


  // public methods

  doneEditing() {
    this._elm.classList.remove('-editing');
    this._isFirstTime = false;
    console.log(this._builder)
    this._builder.changeCondition();
    this._builder.changeCondition();
  }

  // select() {

  // }

  // deselect() {
    
  // }

  remove() {
    console.log(this)
    delete this._conditionValues;
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

  get isFirstTime() {
    return this._isFirstTime;
  }

  get query() {
    return {
      [this._conditionType]: {
        relation: this._elm.dataset.relation,
        terms: Array.from(this._values.querySelectorAll(':scope > .value')).map(value => value.dataset.value)
      }
    }
  }

}