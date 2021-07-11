import ConditionView from './ConditionView.js';
import ConditionItemView from './ConditionItemView.js';
import {conditionItemType} from '../definition.js';

export default class ConditionGroupView extends ConditionView {

  constructor(builder, parentView, logicalOperator = 'and', conditionViews = [], isRoot = false) {
    console.log( parentView, logicalOperator, conditionViews, isRoot )

    super('group', builder, parentView);

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

    // event
    this._logicalOperatorSwitch.addEventListener('click', e => {
      e.stopPropagation();
      this._logicalOperatorSwitch.dataset.operator = {and: 'or', or: 'and'}[this._logicalOperatorSwitch.dataset.operator];
    });
  }

  maketToolbar() {
    const toolbar = document.createElement('nav');
    this._elm.append(toolbar);
    return toolbar;
  }

  addCondition(conditionType) {
    const conditionView = new ConditionItemView(this._builder, this, conditionType);
    this._elm.dataset.numberOfChild = this._numberOfChild;
    return conditionView; 
  }

  /**
   * 
   * @param {Array} conditionViews 
   */
  addGroup(conditionViews) {
    const conditionGroupView = new ConditionGroupView(this._builder, this, 'or', conditionViews);
    console.log(conditionGroupView)
    return conditionGroupView;
  }

  removeCondition(conditionView) {
    this._container.removeChild(conditionView.elm);
    this._elm.dataset.numberOfChild = this._numberOfChild;
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

  get type() {
    return conditionItemType.group;
  }

  get container() {
    return this._container;
  }

  get _numberOfChild() {
    return this._container.querySelectorAll(':scope > .advanced-search-condition-view').length;
  }

}