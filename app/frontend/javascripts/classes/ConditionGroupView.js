import ConditionView from './ConditionView.js';
import ConditionItemView from './ConditionItemView.js';
import {conditionItemType} from '../definition.js';

export default class ConditionGroupView extends ConditionView {

  constructor(builder, parent, parentNode, logicalOperator = 'and', contents = [], isRoot = false) {
    console.log( parentNode, logicalOperator, contents, isRoot )

    super(builder, parent, parentNode);

    // make HTML
    this._elm.classList.add('advanced-search-condition-group-view');
    if (isRoot) this._elm.classList.add('-root');
    this._elm.dataset.numberOfChild = contents.length;
    this._elm.innerHTML = 
    `<div class="logical-operator-switch"></div>
    <div class="container"></div>`;

    // reference
    this._logicalOperatorSwitch = this._elm.querySelector(':scope > .logical-operator-switch');
    this._container = this._elm.querySelector(':scope > .container');

    this._logicalOperatorSwitch.dataset.operator = logicalOperator;

    // event
    this._logicalOperatorSwitch.addEventListener('click', e => {
      e.stopPropagation();
      this._logicalOperatorSwitch.dataset.operator = {and: 'or', or: 'and'}[this._logicalOperatorSwitch.dataset.operator];
    });
  }

  maketToolbar() {
    const toolbar = document.createElement('nav');
    this._elm.insertAdjacentElement('beforeend', toolbar);
    return toolbar;
  }

  addCondition(type) {
    const conditionView = new ConditionItemView(this._builder, this, this._container, type);
    this._elm.dataset.numberOfChild = this._numberOfChild;
    return conditionView; 
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

  get _numberOfChild() {
    return this._container.querySelectorAll(':scope > .advanced-search-condition-view').length;
  }

}