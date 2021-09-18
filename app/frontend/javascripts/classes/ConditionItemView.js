import ConditionView from './ConditionView.js';
import ConditionValues from './ConditionValues.js';
import {ADVANCED_CONDITIONS} from '../global.js';
import {CONDITION_TYPE, CONDITION_ITEM_TYPE} from '../definition.js';

export default class ConditionItemView extends ConditionView {

  /**
   * 
   * @param {AdvancedSearchBuilderView} builder 
   * @param {*} parentView
   * @param {String} conditionType
   * @param {Node} referenceElm
   */
  constructor(builder, parentView, conditionType, referenceElm = null) {
    // console.log(builder, parentView, conditionType);

    super(CONDITION_ITEM_TYPE.condition, builder, parentView, referenceElm);

    this._conditionType = conditionType;
    this._isFirstTime = true;

    // make HTML
    this._elm.classList.add('advanced-search-condition-item-view');
    this._elm.dataset.classification = conditionType;
    // this._elm.dataset.relation = conditionType === 'disease' ? 'eq' : 'eq';
    // TODO: 疾患は contains?
    this._elm.dataset.relation = 'eq';
    this._elm.innerHTML = `
    <div class="body">
      <div class="summary">
        <div class="classification">${ADVANCED_CONDITIONS[conditionType].label}</div>
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
    // stop propagation
    this._elm.addEventListener('click', e => {
      e.stopImmediatePropagation();
    });
    // select/deselect
    summary.addEventListener('click', this._toggleSelecting.bind(this));
    // switch logical operation
    summary.querySelector(':scope > .relation').addEventListener('click', e => {
      e.stopImmediatePropagation();
      // TODO: どうやら、contains, not_contains のトグルらしい
      // if (this._elm.dataset.relation === 'contains') return;
      this._elm.dataset.relation = {eq: 'ne', ne: 'eq'}[this._elm.dataset.relation];
    });
    // switch edit mode
    const editButton = summary.querySelector(':scope > .editbutton');
    editButton.addEventListener('click', e => {
      e.stopImmediatePropagation();
      this._elm.classList.add('-editing');
      this._conditionValues.startToEditCondition();
    });
    editButton.dispatchEvent(new Event('click'));
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
    console.log(this)
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
    if (this._conditionType === CONDITION_TYPE.dataset) {
      const value = this._values.querySelector(':scope > .value');
      const frequencyCountValueView = this._values.querySelector(':scope > .frequency-count-value-view');
      const dataset = {name: value.dataset.value};
      const filtered = frequencyCountValueView.dataset.filtered === 'true' ? true : false;
      if (frequencyCountValueView.dataset.mode === 'frequency' && frequencyCountValueView.dataset.invert === '1') {
        return {
          or: [
            {
              frequency: {
                dataset,
                frequency: {
                  gte: 0,
                  lte: Number(frequencyCountValueView.dataset.from)
                },
                filtered
              }
            },
            {
              frequency: {
                dataset,
                frequency: {
                  gte: Number(frequencyCountValueView.dataset.to),
                  lte: 1
                },
                filtered
              }
            }
          ]
        }
      } else {
        const values = {};
        if (frequencyCountValueView.dataset.from !== '') values.gte = Number(frequencyCountValueView.dataset.from);
        if (frequencyCountValueView.dataset.to !== '') values.lte = Number(frequencyCountValueView.dataset.to);
        return {
          frequency: {
            dataset,
            [frequencyCountValueView.dataset.mode]: values,
            filtered
          }
        }
      }
    } else {
      return {
        [this._conditionType]: {
          relation: this._elm.dataset.relation,
          terms: Array.from(this._values.querySelectorAll(':scope > .value')).map(value => value.dataset.value)
        }
      };
    }
  }

}