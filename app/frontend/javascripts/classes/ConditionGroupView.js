import ConditionView from './ConditionView.js';

export default class ConditionGroupView {

  constructor(builder, parentNode, logicalOperator = 'and', contents = [], isRoot = false) {

    console.log( parentNode, logicalOperator, contents, isRoot )
    this._builder = builder;
    this._logicalOperator = logicalOperator;
    this._contents = contents;

    // make HTML
    this._elm = document.createElement('div');
    this._elm.classList.add('advanced-search-group-view');
    if (isRoot) this._elm.classList.add('-root');
    this._elm.dataset.numberOfChild = this._contents.length;
    this._elm.innerHTML = 
    `<div class="logical-operator-switch"></div>
    <div class="container"></div>`;
    parentNode.insertAdjacentElement('beforeend', this._elm);

    // reference
    this._logicalOperatorSwitch = this._elm.querySelector(':scope > .logical-operator-switch');
    this._container = this._elm.querySelector(':scope > .container');

    this._logicalOperatorSwitch.dataset.operator = this._logicalOperator;

  }

  maketToolbar() {
    const toolbar = document.createElement('nav');
    this._elm.insertAdjacentElement('beforeend', toolbar);
    return toolbar;
  }

  addCondition(type) {
    this._contents.push(new ConditionView(this._builder, this, this._container, type));
    this._elm.dataset.numberOfChild = this._contents.length;
  }

  removeCondition(conditionView) {
    const position = this._contents.indexOf(conditionView);
    this._contents.splice(position, 1);
    this._container.removeChild(conditionView.elm);
    this._elm.dataset.numberOfChild = this._contents.length;
  }


  // accessor

  get elm() {
    return this._elm;
  }

  get query() {
    console.log(this._contents)
    if (this._contents.length === 1) {
      return this._contents[0].query;
    } else {
      return {[this._logicalOperator]: this._contents.map(contents => contents.query)};
    }
  }

}