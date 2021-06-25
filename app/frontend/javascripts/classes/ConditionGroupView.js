import ConditionView from './ConditionView.js';
import ConditionItemView from './ConditionItemView.js';
import {conditionItemType} from '../definition.js';

export default class ConditionGroupView extends ConditionView {

  constructor(builder, parent, parentNode, logicalOperator = 'and', contents = [], isRoot = false) {
    console.log( parentNode, logicalOperator, contents, isRoot )

    super(builder, parent, parentNode);

    this._contents = contents;

    // make HTML
    this._elm.classList.add('advanced-search-group-view');
    if (isRoot) this._elm.classList.add('-root');
    this._elm.dataset.numberOfChild = this._contents.length;
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
    this._contents.push(new ConditionItemView(this._builder, this, this._container, type));
    this._elm.dataset.numberOfChild = this._contents.length;
  }

  removeCondition(conditionView) {
    const position = this._contents.indexOf(conditionView);
    this._contents.splice(position, 1);
    this._container.removeChild(conditionView.elm);
    this._elm.dataset.numberOfChild = this._contents.length;
  }

  // select() {
  //   // this._elm.classList
  // }

  // deselect() {

  // }


  // accessor

  get query() {
    console.log(this._contents)
    if (this._contents.length === 1) {
      return this._contents[0].query;
    } else {
      return {[this._logicalOperatorSwitch.dataset.operator]: this._contents.map(contents => contents.query)};
    }
  }

  get type() {
    return conditionItemType.group;
  }

}