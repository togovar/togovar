import type AdvancedSearchBuilderView from '../AdvancedSearchBuilderView';
import { CONDITION_ITEM_TYPE } from '../../definition';

export interface ConditionView {
  readonly type:
    | typeof CONDITION_ITEM_TYPE.group
    | typeof CONDITION_ITEM_TYPE.condition;
  readonly elm: HTMLElement;
  readonly parentView: GroupView | null;
  readonly siblingElms: HTMLElement[];
  select(): void;
  deselect(): void;
  readonly canUngroup?: boolean;
  readonly canCopy?: boolean;
  readonly query: object; // ← 両クラスにあるので契約へ
  remove(): void; // ← Base で実装
}

export interface GroupView extends ConditionView {
  readonly type: typeof CONDITION_ITEM_TYPE.group;
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
  return !!v && v.type === CONDITION_ITEM_TYPE.group;
}

export abstract class BaseConditionView implements ConditionView {
  readonly type!: ConditionView['type'];
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

  get elm(): HTMLElement {
    return this._el;
  }
  get siblingElms(): HTMLElement[] {
    return Array.from(this._el.parentElement?.children ?? []) as HTMLElement[];
  }
  get parentView(): GroupView | null {
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
    const parent = this.parentView;
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

  abstract get query(): object;

  protected _toggleSelection(e: Event): void {
    e.stopImmediatePropagation();
    if (this._el.classList.contains('-editing')) return;
    const selected = this._el.classList.contains('-selected');
    if (selected) this._builder.selection.deselectConditionView(this);
    else this._builder.selection.selectConditionView(this, false);
  }
}
