import ConditionView from './ConditionView.js';
import ConditionItemView from './ConditionItemView.js';
import {conditionItemType} from '../definition.js';

export default class ConditionGroupView extends ConditionView {

  /**
   * 
   * @param {AdvancedSearchBuilderView} builder 
   * @param {*} parentView
   * @param {String} logicalOperator
   * @param {Array} conditionViews
   * @param {Node} referenceElm
   * @param {Boolean} isRoot
   */
  constructor(builder, parentView, logicalOperator = 'and', conditionViews = [], referenceElm = null, isRoot = false) {
    console.log( parentView, logicalOperator, conditionViews, referenceElm, isRoot )

    super(conditionItemType.group, builder, parentView, referenceElm);

    // make HTML
    this._elm.classList.add('advanced-search-condition-group-view');
    if (isRoot) this._elm.classList.add('-root');
    this._elm.dataset.numberOfChild = conditionViews.length;
    this._elm.innerHTML = 
    `<div class="logical-operator-switch"></div>
    <div class="container"></div>`;

    // reference
    this._logicalOperatorSwitch = this._elm.querySelector(':scope > .logical-operator-switch');
    this._container = this._elm.querySelector(':scope > .container');

    // contents
    for (const conditionView of conditionViews) {
      this._container.append(conditionView.elm);
      conditionView.parentView = this;
    }

    // logical operator
    this._logicalOperatorSwitch.dataset.operator = logicalOperator;

    // events
    // select/deselect
    if (!isRoot) this._elm.addEventListener('click', this._toggleSelecting.bind(this));
    // switch logical operator
    this._logicalOperatorSwitch.addEventListener('click', e => {
      e.stopImmediatePropagation();
      this._logicalOperatorSwitch.dataset.operator = {and: 'or', or: 'and'}[this._logicalOperatorSwitch.dataset.operator];
    });
  }

  maketToolbar() {
    const toolbar = document.createElement('nav');
    this._elm.append(toolbar);
    return toolbar;
  }

  /**
   * 
   * @param {String} conditionType 
   */
  addNewConditionItem(conditionType, referenceElm = null) {
    const conditionView = new ConditionItemView(this._builder, this, conditionType, referenceElm);
    this._elm.dataset.numberOfChild = this._numberOfChild;
    return conditionView;
  }

  /**
   * 
   * @param {Array} conditionViews 
   * @param {Node} referenceElm 
   */
  addNewConditionGroup(conditionViews, referenceElm) {
    const conditionGroupView = new ConditionGroupView(this._builder, this, 'or', conditionViews, referenceElm);
    return conditionGroupView;
  }

  /**
   * 
   */
  ungroup() {
    const conditionViews = Array.from(this._container.querySelectorAll(':scope > .advanced-search-condition-view'));
    this.parentView.addConditionViews(conditionViews, this.elm);
    this.remove();
  }

  /**
   * 
   * @param {Array} conditionViews 
   * @param {Node} referenceElm 
   */
  addConditionViews(conditionViews, referenceElm) {
    console.log(conditionViews, referenceElm)
    for (const view of conditionViews) {
      this._container.insertBefore(view, referenceElm);
    }
  }

  /**
   * 
   * @param {ConditionItemView | ConditionGroupView} conditionView 
   */
  removeConditionView(conditionView) {
    console.log(conditionView)
    this._container.removeChild(conditionView.elm);
    this._elm.dataset.numberOfChild = this._numberOfChild;
    // TODO: もし属する条件が2未満になれば、グループ解除し削除
  }

  // select() {
  //   // this._elm.classList
  // }

  // deselect() {

  // }


  // accessor

  get query() {
    const children = Array.from(this._container.querySelectorAll(':scope > .advanced-search-condition-view'));
    if (this._numberOfChild === 1) {
      return children[0].delegate.query;
    } else {
      return {[this._logicalOperatorSwitch.dataset.operator]: children.map(el => el.delegate.query)};
    }
  }

  get container() {
    return this._container;
  }

  get childViews() {
    return Array.from(this._container.childNodes).map(el => el.delegate);
  }

  get _numberOfChild() {
    return this._container.querySelectorAll(':scope > .advanced-search-condition-view').length;
  }

}