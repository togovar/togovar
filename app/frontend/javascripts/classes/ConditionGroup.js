import Condition from './Condition.js';

export default class ConditionGroup {

  constructor(delegate, parentNode, logicalOperator = 'and', contents = [], isRoot = false) {

    console.log( parentNode, logicalOperator, contents, isRoot )
    this._delegate = delegate;
    this._logicalOperator = logicalOperator;
    this._contents = contents;

    // make HTML
    this._elm = document.createElement('div');
    this._elm.classList.add('advanced-search-group-view');
    if (isRoot) this._elm.classList.add('-root');
    this._elm.dataset.numberOfChild = contents.length;
    this._elm.innerHTML = 
    `<div class="logical-operator-switch"></div>
    <div class="container"></div>`;
    parentNode.insertAdjacentElement('beforeend', this._elm);

    // reference
    this._logicalOperatorSwitch = this._elm.querySelector(':scope > .logical-operator-switch');
    this._container = this._elm.querySelector(':scope > .container');

    console.log(this._logicalOperatorSwitch)
    console.log(this._container)

  }

  maketToolbar() {
    const toolbar = document.createElement('nav');
    this._elm.insertAdjacentElement('beforeend', toolbar);
    return toolbar;
  }

  addCondition(type) {
    this._contents.push(new Condition(this._delegate, this._container, type));
  }

}