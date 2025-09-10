import type AdvancedSearchBuilderView from '../AdvancedSearchBuilderView';
import ConditionItemView from './ConditionItemView';
import ConditionGroupView from './ConditionGroupView';

interface DelegateElement extends HTMLElement {
  delegate: ConditionItemView | ConditionGroupView;
}

export class ConditionView {
  private _conditionViewEl: HTMLDivElement;
  private _type: number;
  private _builder: AdvancedSearchBuilderView;
  private _parentView?: ConditionItemView | ConditionGroupView;

  /**
   * @param {Number} type - what number???
   * @param {AdvancedSearchBuilderView} builder - Static Object(_container, _elm, _rootGroup, _selection, _toolbar)
   * @param {ConditionItemView | ConditionGroupView} parentView - Dynamic Object(_builder, _container, _elm, _logicalOperatorSwitch, _mutationObserver, _type)
   * @param {Node} referenceElm - what's this? null??
   */
  constructor(
    type: number,
    builder: AdvancedSearchBuilderView,
    parentView: { container: HTMLElement },
    referenceElm: Node | null
  ) {
    this._type = type;
    this._builder = builder;

    // make HTML
    this._conditionViewEl = document.createElement('div');
    this._conditionViewEl.classList.add('advanced-search-condition-view');
    (this._conditionViewEl as any).delegate = this;

    // Insert the condition view element into the parent container.
    // If the reference element exists within the parent container, insert the condition view element before it.
    // Otherwise, append the condition view element to the end of the parent container.
    if (parentView.container.contains(referenceElm)) {
      parentView.container.insertBefore(this._conditionViewEl, referenceElm);
    } else {
      parentView.container.appendChild(this._conditionViewEl);
    }
  }

  // public methods

  select(): void {
    this._conditionViewEl.classList.add('-selected');
  }

  deselect(): void {
    this._conditionViewEl.classList.remove('-selected');
  }

  remove(): void {
    const parent = this.parentView;
    if (parent && 'removeConditionView' in parent) {
      parent.removeConditionView(
        this as unknown as ConditionItemView | ConditionGroupView
      );
    }

    this._conditionViewEl.remove();
    this._parentView = undefined;
  }

  // accessor

  get elm(): HTMLElement {
    return this._conditionViewEl;
  }

  get siblingElms(): Node[] {
    return Array.from(this._conditionViewEl.parentNode?.childNodes || []);
  }

  get type(): number {
    return this._type;
  }

  get isSelecting() {
    return this._conditionViewEl.classList.contains('-selected');
  }

  get parentView(): ConditionItemView | ConditionGroupView | undefined {
    const closestElement = this._conditionViewEl.parentNode as HTMLElement;
    return (
      closestElement.closest(
        '.advanced-search-condition-view'
      ) as DelegateElement
    )?.delegate;
  }

  set parentView(parentView: ConditionItemView | ConditionGroupView) {
    this._parentView = parentView;
  }

  get depth(): number {
    let parentView = this.parentView;
    let depth = 0;
    while (parentView) {
      parentView = parentView.parentView;
      if (parentView) depth++;
    }
    return depth;
  }

  /**
   * Toggles the selection state of the condition view.
   * If the condition view is currently being edited, the toggle is ignored.
   * Otherwise, it selects or deselects the condition view based on its current state.
   *
   * @param e - The event object triggered by the user interaction.
   */
  protected toggleSelectionState(e: Event): void {
    e.stopImmediatePropagation();
    const isEditing = this._conditionViewEl.classList.contains('-editing');
    if (isEditing) return;

    const isSelecting = this._conditionViewEl.classList.contains('-selected');

    if (isSelecting) {
      this._builder.selection.deselectConditionView(this);
    } else {
      this._builder.selection.selectConditionView(this, false);
    }
  }
}
