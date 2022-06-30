import ConditionView from './ConditionView.js';
import ConditionItemView from './ConditionItemView.js';
import { CONDITION_ITEM_TYPE } from '../definition.js';

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
  constructor(
    builder,
    parentView,
    logicalOperator = 'and',
    conditionViews = [],
    referenceElm = null,
    isRoot = false
  ) {
    super(CONDITION_ITEM_TYPE.group, builder, parentView, referenceElm);

    // make HTML
    this._elm.classList.add('advanced-search-condition-group-view');
    this._isRoot = isRoot;
    if (isRoot) this._elm.classList.add('-root');
    this._elm.dataset.numberOfChild = conditionViews.length;
    this._elm.innerHTML = `<div class="logical-operator-switch"></div>
    <div class="container"></div>`;

    // reference
    this._logicalOperatorSwitch = this._elm.querySelector(
      ':scope > .logical-operator-switch'
    );
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
    if (!isRoot)
      this._elm.addEventListener('click', this._toggleSelecting.bind(this));
    // switch logical operator
    this._logicalOperatorSwitch.addEventListener('click', (e) => {
      e.stopImmediatePropagation();
      this._logicalOperatorSwitch.dataset.operator = { and: 'or', or: 'and' }[
        this._logicalOperatorSwitch.dataset.operator
      ];
      this._doneEditing();
    });
    // mutation
    this._mutationObserver = this._defineObserveConditions();
  }

  _doneEditing() {
    this._builder.changeCondition();
  }

  // public methods

  maketToolbar() {
    const toolbar = document.createElement('nav');
    this._elm.append(toolbar);
    return toolbar;
  }

  /**
   *
   * @param {String} conditionType
   */
  addNewConditionItem(conditionType, options, referenceElm = null) {
    const conditionView = new ConditionItemView(
      this._builder,
      this,
      conditionType,
      options,
      referenceElm
    );
    return conditionView;
  }

  /**
   *
   * @param {Array} conditionViews
   * @param {Node} referenceElm
   */
  addNewConditionGroup(conditionViews, referenceElm) {
    const conditionGroupView = new ConditionGroupView(
      this._builder,
      this,
      'or',
      conditionViews,
      referenceElm
    );
    return conditionGroupView;
  }

  /**
   *
   */
  ungroup() {
    const conditionViews = Array.from(
      this._container.querySelectorAll(
        ':scope > .advanced-search-condition-view'
      )
    );
    this.parentView.addConditionViews(conditionViews, this.elm);
    this.remove();
  }

  /**
   *
   * @param {Array} conditionViews
   * @param {Node} referenceElm
   */
  addConditionViews(conditionViews, referenceElm) {
    for (const view of conditionViews) {
      this._container.insertBefore(view, referenceElm);
    }
  }

  /**
   *
   * @param {ConditionItemView | ConditionGroupView} conditionView
   */
  removeConditionView(conditionView) {
    this._container.removeChild(conditionView.elm);
  }

  remove() {
    this._mutationObserver.disconnect();
    super.remove();
  }

  // select() {
  //   // this._elm.classList
  // }

  // deselect() {

  // }

  // private methods

  _defineObserveConditions() {
    const config = { attributes: false, childList: true, subtree: false };
    const callback = function (mutationsList) {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          const numberOfChild = this._numberOfChild;
          this._elm.dataset.numberOfChild = numberOfChild;
          // if the number of child is less than 2, ungroup
          if (!this._isRoot && numberOfChild <= 1) this.ungroup();
        }
      }
    };
    const observer = new MutationObserver(callback.bind(this));
    observer.observe(this._container, config);
    return observer;
  }

  // accessor

  get query() {
    const children = Array.from(
      this._container.querySelectorAll(
        ':scope > .advanced-search-condition-view'
      )
    );
    switch (this._numberOfChild) {
      case 0:
        return {};
      case 1:
        return children[0].delegate.query;
      default:
        return {
          [this._logicalOperatorSwitch.dataset.operator]: children.map(
            (el) => el.delegate.query
          ),
        };
    }
  }

  get container() {
    return this._container;
  }

  get childViews() {
    return Array.from(this._container.childNodes).map((el) => el.delegate);
  }

  get _numberOfChild() {
    return this._container.querySelectorAll(
      ':scope > .advanced-search-condition-view'
    ).length;
  }
}
