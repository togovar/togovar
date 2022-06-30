import ConditionView from './ConditionView.js';
import ConditionValues from './ConditionValues.js';
import { ADVANCED_CONDITIONS } from '../global.js';
import { CONDITION_TYPE, CONDITION_ITEM_TYPE } from '../definition.js';

export default class ConditionItemView extends ConditionView {
  /**
   *
   * @param {AdvancedSearchBuilderView} builder
   * @param {*} parentView
   * @param {String} conditionType
   * @param {Node} referenceElm
   */
  constructor(builder, parentView, conditionType, referenceElm = null) {
    super(CONDITION_ITEM_TYPE.condition, builder, parentView, referenceElm);

    this._conditionType = conditionType;
    this._isFirstTime = true;

    // make HTML
    this._elm.classList.add('advanced-search-condition-item-view');
    this._elm.dataset.classification = conditionType;
    this._elm.dataset.relation = conditionType === 'dataset' ? '' : 'eq';
    // TODO: 疾患は contains?
    this._elm.innerHTML = `
    <div class="body">
      <div class="summary">
        <div class="classification">${ADVANCED_CONDITIONS[conditionType].label}</div>
        <div class="relation"></div>
        <div class="values"></div>
        <div class="buttons">
          <button class="edit" title="Edit"></button>
          <button class="delete" title="Delete"></button>
        </div>
      </div>
      <div class="advanced-search-condition-editor-view"></div>
    </div>
    <div class="bg"></div>`;

    // reference
    const body = this._elm.querySelector(':scope > .body');
    const summary = body.querySelector(':scope > .summary');
    this._values = summary.querySelector(':scope > .values');
    this._editor = body.querySelector(
      ':scope > .advanced-search-condition-editor-view'
    );
    this._conditionValues = new ConditionValues(this);

    // events
    // stop propagation
    this._elm.addEventListener('click', (e) => {
      e.stopImmediatePropagation();
    });
    // select/deselect
    summary.addEventListener('click', this._toggleSelecting.bind(this));
    // switch logical operation
    summary
      .querySelector(':scope > .relation')
      .addEventListener('click', (e) => {
        e.stopImmediatePropagation();
        // TODO: どうやら、contains, not_contains のトグルらしい
        // if (this._elm.dataset.relation === 'contains') return;
        this._elm.dataset.relation = { eq: 'ne', ne: 'eq' }[
          this._elm.dataset.relation
        ];
        this.doneEditing();
      });
    // buttons
    for (const button of summary.querySelectorAll(
      ':scope > .buttons > button'
    )) {
      button.addEventListener('click', (e) => {
        e.stopImmediatePropagation();
        switch (e.target.className) {
          case 'edit':
            this._elm.classList.add('-editing');
            this._conditionValues.startToEditCondition();
            break;
          case 'delete':
            this._builder.delete([this]);
            break;
        }
      });
    }
    summary
      .querySelector(':scope > .buttons > button.edit')
      .dispatchEvent(new Event('click'));
  }

  // public methods

  doneEditing() {
    this._elm.classList.remove('-editing');
    this._isFirstTime = false;
    this._builder.changeCondition();
  }

  // select() {

  // }

  // deselect() {

  // }

  remove() {
    delete this._conditionValues;
    super.remove();
    // this._parent.removeConditionView(this);
  }

  // accessor

  get conditionType() {
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
    const values = Array.from(
      this._values.querySelectorAll(':scope > condition-item-value-view')
    );
    if (this._conditionType === CONDITION_TYPE.dataset) {
      // if the condition type is 'dataset', special conditional expression is needed
      const queries = values.map(
        (view) =>
          view.shadowRoot.querySelector('frequency-count-value-view').queryValue
      );
      return queries.length <= 1 ? queries[0] : { or: queries };
    } else {
      return {
        [this._conditionType]: {
          relation: this._elm.dataset.relation,
          terms: values.map((value) => value.value),
        },
      };
    }
  }
}
