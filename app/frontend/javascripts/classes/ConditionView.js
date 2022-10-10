// import {ADVANCED_CONDITIONS} from '../global.js';

export default class ConditionItemView {
  /**
   * @param {Number} type - what number???
   * @param {AdvancedSearchBuilderView} builder - Static Object(_container, _elm, _rootGroup, _selection, _toolbar)
   * @param {ConditionItemView | ConditionGroupView} parentView - Dynamic Object(_builder, _container, _elm, _logicalOperatorSwitch, _mutationObserver, _type)
   * @param {Node} referenceElm - what's this? null??
   */
  constructor(type, builder, parentView, referenceElm) {
    this._type = type;
    this._builder = builder;
    // this._parentView = parentView;

    // make HTML
    this._elm = document.createElement('div');
    this._elm.classList.add('advanced-search-condition-view');
    this._elm.delegate = this;
    parentView.container.insertBefore(this._elm, referenceElm);

    // event
    // let eventTarget;
    // switch (type) {
    //   case 'group':
    //   eventTarget = this._elm;
    //   break;
    //   case 'item':
    //   eventTarget = this._elm.querySelector(':scope > .body > .summary');
    //   break;
    // }
    // eventTarget.addEventListener('click', e => {
    //   e.stopPropagation();
    // });
  }

  // private methods

  _toggleSelecting(e) {
    e.stopImmediatePropagation();
    if (this.isSelecting) {
      this._builder.selection.deselectConditionView(this);
    } else {
      this._builder.selection.selectConditionView(this, false);
    }

    // if (e.shiftKey) {
    //   if (this.isSelecting) {
    //     this._builder.selection.deselectConditionViews([this]);
    //   } else {
    //     this._builder.selection.selectConditionViews([this], false);
    //   }
    // } else {
    //   this._builder.selection.selectConditionViews([this], true);
    // }
  }

  // public methods

  select() {
    this._elm.classList.add('-selected');
  }

  deselect() {
    this._elm.classList.remove('-selected');
  }

  remove() {
    this.parentView.removeConditionView(this);
    delete this;
  }

  // accessor

  /**
   * @return {HTMLElement}
   */
  get elm() {
    return this._elm;
  }

  get siblingElms() {
    return [...this._elm.parentNode.childNodes];
  }

  /**
   * @return {Number}
   */
  get type() {
    return this._type;
  }

  /**
   * @return {Boolean}
   */
  get isSelecting() {
    return this._elm.classList.contains('-selected');
  }

  /**
   * @return {ConditionItemView | ConditionGroupView}
   */
  get parentView() {
    return this.elm.parentNode.closest('.advanced-search-condition-view')
      .delegate;
  }

  /**
   * @param {parentView} conditionGroupView
   */
  set parentView(parentView) {
    this._parentView = parentView;
  }

  get depth() {
    let parentView = this.parentView;
    let depth = 0;
    while (parentView) {
      parentView = parentView.parentView;
      if (parentView) depth++;
    }
    return depth;
  }
}
