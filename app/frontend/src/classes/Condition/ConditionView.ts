import type AdvancedSearchBuilderView from '../AdvancedSearchBuilderView';
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
    _conditionType: string,
    _options: any,
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

export abstract class BaseConditionView implements ConditionView {
  readonly conditionNodeKind!: ConditionView['conditionNodeKind'];
  protected readonly _builder: AdvancedSearchBuilderView;
  protected readonly _rootEl: HTMLDivElement;

  constructor(
    builder: AdvancedSearchBuilderView,
    parentContainer: HTMLElement,
    ref: Node | null
  ) {
    this._builder = builder;
    this._rootEl = document.createElement('div');
    this._rootEl.classList.add('advanced-search-condition-view');
    if (ref && parentContainer.contains(ref))
      parentContainer.insertBefore(this._rootEl, ref);
    else parentContainer.appendChild(this._rootEl);
    viewByEl.set(this._rootEl, this);

    // ★ 互換レイヤー（旧 AdvancedSearchSelection が el.delegate を参照するため）
    (this._rootEl as any).delegate = this;
  }

  get rootEl(): HTMLElement {
    return this._rootEl;
  }
  get childEls(): HTMLElement[] {
    return Array.from(
      this._rootEl.parentElement?.children ?? []
    ) as HTMLElement[];
  }
  get parentGroup(): GroupView | null {
    const host = this._rootEl.parentElement;
    const groupEl = host?.closest(
      '.advanced-search-condition-group-view'
    ) as HTMLElement | null;
    const view = groupEl ? viewByEl.get(groupEl) : undefined;
    return isGroupView(view) ? view : null;
  }
  select(): void {
    this._rootEl.classList.add('-selected');
    this._rootEl.setAttribute('aria-selected', 'true');
  }
  deselect(): void {
    this._rootEl.classList.remove('-selected');
    this._rootEl.removeAttribute('aria-selected');
  }
  remove(): void {
    const parent = this.parentGroup;
    if (parent) parent.removeConditionView(this);
    viewByEl.delete(this._rootEl);
    this._rootEl.remove();
  }
  get canUngroup(): boolean | undefined {
    return undefined;
  }
  get canCopy(): boolean | undefined {
    return undefined;
  }

  abstract get queryFragment(): object;

  protected _toggleSelection(e: Event): void {
    e.stopImmediatePropagation();
    if (this._rootEl.classList.contains('-editing')) return;
    const selected = this._rootEl.classList.contains('-selected');
    if (selected) this._builder.selection.deselectConditionView(this);
    else this._builder.selection.selectConditionView(this, false);
  }
}
