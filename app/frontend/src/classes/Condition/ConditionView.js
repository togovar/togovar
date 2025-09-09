export class ConditionView {
  /**
   * @param {Number} type - what number???
   * @param {AdvancedSearchBuilderView} builder - Static Object(_container, _elm, _rootGroup, _selection, _toolbar)
   * @param {ConditionItemView | ConditionGroupView} parentView - Dynamic Object(_builder, _container, _elm, _logicalOperatorSwitch, _mutationObserver, _type)
   * @param {Node} referenceElm - what's this? null??
   */
  constructor(type, builder, parentView, referenceElm) {
    this._type = type;
    this._builder = builder;

    // make HTML
    this._conditionViewEl = document.createElement('div');
    this._conditionViewEl.classList.add('advanced-search-condition-view');
    this._conditionViewEl.delegate = this;

    // Insert the condition view element into the parent container.
    // If the reference element exists within the parent container, insert the condition view element before it.
    // Otherwise, append the condition view element to the end of the parent container.
    if (parentView.container.contains(referenceElm)) {
      parentView.container.insertBefore(this._conditionViewEl, referenceElm);
    } else {
      parentView.container.appendChild(this._conditionViewEl);
    }
  }

  // private methods

  _toggleSelecting(e) {
    e.stopImmediatePropagation();
    const ifEditing = this._conditionViewEl.classList.contains('-editing');
    if (ifEditing) return;

    if (this.isSelecting) {
      this._builder.selection.deselectConditionView(this);
    } else {
      this._builder.selection.selectConditionView(this, false);
    }
  }

  // public methods

  select() {
    this._conditionViewEl.classList.add('-selected');
  }

  deselect() {
    this._conditionViewEl.classList.remove('-selected');
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
    return this._conditionViewEl;
  }

  get siblingElms() {
    return [...this._conditionViewEl.parentNode.childNodes];
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
    return this._conditionViewEl.classList.contains('-selected');
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
