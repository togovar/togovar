import type { AdvancedSearchBuilderView } from '../AdvancedSearch/AdvancedSearchBuilderView';
import type { ConditionTypeValue } from '../../definition';
import { CONDITION_NODE_KIND } from '../../definition';

/** グループと条件行の両方が実装する公開インターフェース。 */
export interface ConditionView {
  /** 選択状態を有効にする。 */
  select(): void;
  /** 選択状態を解除する。 */
  deselect(): void;
  /** DOMとViewインスタンスを削除する。 */
  remove(): void;
  /** group か condition かを識別するためのノード種別。 */
  readonly conditionNodeKind:
    | typeof CONDITION_NODE_KIND.group
    | typeof CONDITION_NODE_KIND.condition;
  /** このViewのルートDOM要素。 */
  readonly rootEl: HTMLElement;
  /** このViewが属するGroupViewを参照する。ルートまたは切り離し済みの場合はnull。 */
  readonly parentGroup: GroupView | null;
  /** 同じ親コンテナ内の兄弟要素一覧。drag&drop順序計算などで使う。 */
  readonly childEls: HTMLElement[];
  /** このViewが保持する検索クエリフラグメント。 */
  readonly queryFragment: object;
  /** このViewをグループ解除できるか。ツールバーのungroup可否制御に使う。 */
  readonly canUngroup?: boolean;
  /** このViewをコピーできるか。ツールバーのcopy可否制御に使う。 */
  readonly canCopy?: boolean;
}

/** グループ固有の操作を追加したインターフェース。 */
export interface GroupView extends ConditionView {
  /** 指定した子Viewを削除する。 */
  removeConditionView(_view: ConditionView): void;
  /** 選択中のViewを新しいサブグループで包む。 */
  addNewConditionGroup(
    _selected: ConditionView[],
    _ref?: HTMLElement | null
  ): GroupView;
  /** 既存のViewノードを指定位置へ挿入する。ungroupで子を上位へ移動するときに使う。 */
  addConditionViews(_conditionViews: Node[], _referenceElm: Node | null): void;
  /** 新しい条件行を追加する。 */
  addNewConditionItem(
    _conditionType: ConditionTypeValue,
    _referenceElm?: Node | null,
    _options?: unknown
  ): ConditionView;
  /** URL復元用の空グループを追加する。 */
  addEmptyConditionGroup?(
    _logicalOperator?: 'and' | 'or',
    _referenceElm?: Node | null
  ): GroupView;
  /** グループ直下の条件をすべて削除する。popstate時のView再構築で使う。 */
  clearConditionViews?(): void;
  /** このグループを解除し子Viewを親へ昇格する。 */
  ungroup(): void;
  /** グループであることを示す conditionNodeKind。 */
  readonly conditionNodeKind: typeof CONDITION_NODE_KIND.group;
  /** 子Viewを配置するコンテナ要素。 */
  readonly container: HTMLElement;
  /** 子Viewの一覧。 */
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

  /**
   * @param builder         操作を委譲するBuilderView
   * @param parentContainer このViewを挿入する親コンテナ
   * @param ref             この要素の直前に挿入する参照ノード（nullなら末尾に追加）
   */
  constructor(
    builder: AdvancedSearchBuilderView,
    parentContainer: HTMLElement,
    ref: Node | null
  ) {
    this._builder = builder;

    this._rootEl = document.createElement('div');
    this._rootEl.classList.add('advanced-search-condition-view');

    // ref が親コンテナ内に存在する場合だけ insertBefore を使い、それ以外は末尾へ追加する。
    if (ref && parentContainer.contains(ref))
      parentContainer.insertBefore(this._rootEl, ref);
    else parentContainer.appendChild(this._rootEl);

    viewByEl.set(this._rootEl, this);
  }

  /** このViewのルートDOM要素。サブクラスがDOMを操作するために参照する。 */
  get rootEl(): HTMLElement {
    return this._rootEl;
  }

  /**
   * 同じ親コンテナ内の兄弟要素一覧。
   * インメモリキャッシュを持たずDOMを直接参照することで、外部からのDOM操作とのズレを防ぐ。
   */
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

  /** aria-selected 属性で選択状態を表現する。表示制御はCSSに委ねる。 */
  select(): void {
    this._rootEl.setAttribute('aria-selected', 'true');
  }

  /** 選択状態を解除する。aria-selected 属性を削除することでCSSが非選択スタイルを適用する。 */
  deselect(): void {
    this._rootEl.removeAttribute('aria-selected');
  }

  /**
   * 親グループに通知してからDOMとviewByElエントリを削除する。
   * 親グループへの通知が先なのはungroup判定などの副作用を正しく発火させるため。
   */
  remove(): void {
    const parent = this.parentGroup;
    if (parent) parent.removeConditionView(this);
    viewByEl.delete(this._rootEl);
    this._rootEl.remove();
  }

  /** サブクラスがDOMの現在状態からクエリを組み立てて返す。 */
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
