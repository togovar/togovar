import type { AdvancedSearchBuilderView } from '../AdvancedSearchBuilderView';
import type { ConditionTypeValue } from '../../definition';
import { CONDITION_NODE_KIND } from '../../definition';

/** Public contract for both condition items and groups */
export interface ConditionView {
  select(): void; // Select this view in the UI (CSS-driven)
  deselect(): void; // Clear the selected state
  remove(): void; // Remove from parent group and the DOM (detach listeners/resources as needed)
  readonly conditionNodeKind:
    | typeof CONDITION_NODE_KIND.group
    | typeof CONDITION_NODE_KIND.condition;
  readonly rootEl: HTMLElement;
  readonly parentGroup: GroupView | null;
  readonly childEls: HTMLElement[];
  readonly queryFragment: object;
  readonly canUngroup?: boolean;
  readonly canCopy?: boolean;
}

/** Group-specific */
export interface GroupView extends ConditionView {
  removeConditionView(_view: ConditionView): void;
  addNewConditionGroup(
    _selected: ConditionView[],
    _ref?: HTMLElement | null
  ): GroupView;
  addConditionViews(_conditionViews: Node[], _referenceElm: Node | null): void;
  addNewConditionItem(
    _conditionType: ConditionTypeValue,
    _referenceElm?: Node | null
  ): ConditionView;
  ungroup(): void;
  readonly conditionNodeKind: typeof CONDITION_NODE_KIND.group;
  readonly container: HTMLElement;
  readonly childViews: ConditionView[];
}

/** Maps a view's host DOM element to its owning ConditionView instance. */
export const viewByEl = new WeakMap<HTMLElement, ConditionView>();

/**
 * Type guard that narrows a `ConditionView | null | undefined` to `GroupView`
 * @param view - Value to test (a `ConditionView` or `null`/`undefined`).
 * @returns `true` if `view` is a `GroupView`; otherwise `false`.
 */
export function isGroupView(
  view: ConditionView | null | undefined
): view is GroupView {
  return !!view && view.conditionNodeKind === CONDITION_NODE_KIND.group;
}

/** Abstract base class for group and item condition views */
export abstract class BaseConditionView implements ConditionView {
  // Structural discriminant (group | condition)
  readonly conditionNodeKind!: ConditionView['conditionNodeKind'];
  protected readonly _builder: AdvancedSearchBuilderView;
  protected readonly _rootEl: HTMLDivElement;

  constructor(
    builder: AdvancedSearchBuilderView,
    parentContainer: HTMLElement,
    ref: Node | null
  ) {
    this._builder = builder;

    // Create the host element and attach it
    this._rootEl = document.createElement('div');
    this._rootEl.classList.add('advanced-search-condition-view');

    if (ref && parentContainer.contains(ref))
      parentContainer.insertBefore(this._rootEl, ref);
    else parentContainer.appendChild(this._rootEl);

    // Register: host element -> view instance
    viewByEl.set(this._rootEl, this);
  }

  /** Exposes the host/root DOM element of this view. */
  get rootEl(): HTMLElement {
    return this._rootEl;
  }

  /** Direct element children of the parent container  */
  get childEls(): HTMLElement[] {
    return Array.from(
      this._rootEl.parentElement?.children ?? []
    ) as HTMLElement[];
  }

  /** Parent group view; `null` when this view is the root or detached. */
  get parentGroup(): GroupView | null {
    const parent = this._rootEl.parentElement;
    const groupEl = parent?.closest(
      '.advanced-search-condition-group-view'
    ) as HTMLElement | null;
    const view = groupEl ? viewByEl.get(groupEl) : undefined;
    return isGroupView(view) ? view : null;
  }

  /** Marks this view as selected (CSS-driven) */
  select(): void {
    this._rootEl.setAttribute('aria-selected', 'true');
  }
  /** Clears the selected state */
  deselect(): void {
    this._rootEl.removeAttribute('aria-selected');
  }

  /** Removes this view from its parent group and the DOM. */
  remove(): void {
    const parent = this.parentGroup;
    if (parent) parent.removeConditionView(this);
    viewByEl.delete(this._rootEl);
    this._rootEl.remove();
  }

  /**
   * Serializable fragment of the global query produced by this view.
   *
   * Examples:
   * - Group: `{ and: [child1, child2, ...] }` or `{}` when empty.
   * - Item:  `{ gene: { relation: 'eq', terms: [...] } }`, etc.
   */
  abstract get queryFragment(): object;

  /**
   * Shared handler for selection toggling.
   * - Ignores toggles while in editing mode.
   * - Delegates to the builder's selection manager.
   *
   * @param e - The triggering event (click, etc.)
   */
  protected _toggleSelection(e: Event): void {
    e.stopPropagation();
    if (this._rootEl.classList.contains('-editing')) return;

    const isSelected = this._rootEl.getAttribute('aria-selected') === 'true';
    if (isSelected) {
      this._builder.selection.deselectConditionView(this);
    } else {
      this._builder.selection.selectConditionView(this, false);
    }
  }
}
