import type { AdvancedSearchBuilderView } from '../AdvancedSearch/AdvancedSearchBuilderView';
import type { ConditionTypeValue } from '../../definition';
import { CONDITION_NODE_KIND } from '../../definition';

/** グループと条件行の両方が実装する公開インターフェース。 */
export interface ConditionView {
  select(): void;
  deselect(): void;
  remove(): void;
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

/** グループ固有の操作を追加したインターフェース。 */
export interface GroupView extends ConditionView {
  removeConditionView(_view: ConditionView): void;
  addNewConditionGroup(
    _selected: ConditionView[],
    _ref?: HTMLElement | null
  ): GroupView;
  addConditionViews(_conditionViews: Node[], _referenceElm: Node | null): void;
  addNewConditionItem(
    _conditionType: ConditionTypeValue,
    _referenceElm?: Node | null,
    _options?: unknown
  ): ConditionView;
  addEmptyConditionGroup?(
    _logicalOperator?: 'and' | 'or',
    _referenceElm?: Node | null
  ): GroupView;
  clearConditionViews?(): void;
  ungroup(): void;
  readonly conditionNodeKind: typeof CONDITION_NODE_KIND.group;
  readonly container: HTMLElement;
  readonly childViews: ConditionView[];
}

/**
 * DOM要素からViewインスタンスを逆引きするマップ。
 * WeakMapにすることでViewがGCされるとエントリも自動回収される。
 */
export const viewByEl = new WeakMap<HTMLElement, ConditionView>();

/** conditionNodeKind で GroupView を識別する型ガード。 */
export function isGroupView(
  view: ConditionView | null | undefined
): view is GroupView {
  return !!view && view.conditionNodeKind === CONDITION_NODE_KIND.group;
}

/**
 * GroupView と ConditionItemView が共有する基底クラス。
 *
 * DOM要素の生成・配置・viewByEl登録・選択トグルを共通化する。
 * select/deselect は aria-selected 属性で表現し、表示はCSSに委ねる。
 */
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
  }

  get rootEl(): HTMLElement {
    return this._rootEl;
  }

  get childEls(): HTMLElement[] {
    return Array.from(
      this._rootEl.parentElement?.children ?? []
    ) as HTMLElement[];
  }

  /** 親GroupViewをDOMから逆引きする。rootまたは切り離し済みの場合はnull。 */
  get parentGroup(): GroupView | null {
    const parent = this._rootEl.parentElement;
    const groupEl = parent?.closest(
      '.advanced-search-condition-group-view'
    ) as HTMLElement | null;
    const view = groupEl ? viewByEl.get(groupEl) : undefined;
    return isGroupView(view) ? view : null;
  }

  select(): void {
    this._rootEl.setAttribute('aria-selected', 'true');
  }
  deselect(): void {
    this._rootEl.removeAttribute('aria-selected');
  }

  remove(): void {
    const parent = this.parentGroup;
    if (parent) parent.removeConditionView(this);
    viewByEl.delete(this._rootEl);
    this._rootEl.remove();
  }

  abstract get queryFragment(): object;

  /**
   * 選択トグルの共通処理。
   * 編集モード中（-editingクラスあり）はクリックで選択が切り替わらないよう保護する。
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
