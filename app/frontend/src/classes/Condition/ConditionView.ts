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
  readonly conditionNodeKind: typeof CONDITION_NODE_KIND.group;
  readonly container: HTMLElement;
  readonly childViews: ConditionView[];
  removeConditionView(_view: ConditionView): void;
  addNewConditionGroup(
    _selected: ConditionView[],
    _ref?: HTMLElement | null
  ): GroupView;
  addConditionViews(_conditionViews: Node[], _referenceElm: Node | null): void; // ← 追加

  addNewConditionItem(
    _conditionType: string,
    _options: any,
    _referenceElm?: Node | null
  ): ConditionView;
  ungroup(): void;
}

export const viewByEl = new WeakMap<HTMLElement, ConditionView>();

export function isGroupView(
  v: ConditionView | null | undefined
): v is GroupView {
  return !!v && v.conditionNodeKind === CONDITION_NODE_KIND.group;
}

export abstract class BaseConditionView implements ConditionView {
  readonly conditionNodeKind!: ConditionView['conditionNodeKind'];
  protected readonly _builder: AdvancedSearchBuilderView;
  protected readonly _el: HTMLDivElement;

  constructor(
    builder: AdvancedSearchBuilderView,
    parentContainer: HTMLElement,
    ref: Node | null
  ) {
    this._builder = builder;
    this._el = document.createElement('div');
    this._el.classList.add('advanced-search-condition-view');
    if (ref && parentContainer.contains(ref))
      parentContainer.insertBefore(this._el, ref);
    else parentContainer.appendChild(this._el);
    viewByEl.set(this._el, this);

    // BaseConditionView constructor の末尾あたり
    viewByEl.set(this._el, this);

    // ★ 互換レイヤー（旧 AdvancedSearchSelection が el.delegate を参照するため）
    (this._el as any).delegate = this;
  }

  get rootEl(): HTMLElement {
    return this._el;
  }
  get childEls(): HTMLElement[] {
    return Array.from(this._el.parentElement?.children ?? []) as HTMLElement[];
  }
  get parentGroup(): GroupView | null {
    const host = this._el.parentElement;
    const groupEl = host?.closest(
      '.advanced-search-condition-group-view'
    ) as HTMLElement | null;
    const v = groupEl ? viewByEl.get(groupEl) : undefined;
    return isGroupView(v) ? v : null;
  }
  select(): void {
    this._el.classList.add('-selected');
    this._el.setAttribute('aria-selected', 'true');
  }
  deselect(): void {
    this._el.classList.remove('-selected');
    this._el.removeAttribute('aria-selected');
  }
  remove(): void {
    const parent = this.parentGroup;
    if (parent) parent.removeConditionView(this);
    viewByEl.delete(this._el);
    this._el.remove();
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
    if (this._el.classList.contains('-editing')) return;
    const selected = this._el.classList.contains('-selected');
    if (selected) this._builder.selection.deselectConditionView(this);
    else this._builder.selection.selectConditionView(this, false);
  }
}
