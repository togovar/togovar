import { selectRequired } from '../utils/dom/select';
import type { AdvancedSearchBuilderView } from './AdvancedSearchBuilderView';
import { type ConditionView, viewByEl } from './Condition/ConditionView';

/** 選択中の条件 View を取得するセレクタ。グループと条件項目で共通のクラスを使う。 */
const SELECTED_SEL =
  '.advanced-search-condition-view[aria-selected="true"]' as const;

/** 選択状態を表す ARIA 属性。 */
const ARIA_SELECTED = 'aria-selected';

const ROOT_CONTAINER_SEL =
  ':scope > .advanced-search-condition-group-view.-root > .container' as const;

/**
 * 高度検索の複数選択を管理する。
 *
 * 選択状態の正本は DOM。
 * - 選択中の要素には `aria-selected="true"` を付ける
 * - DOM から View への変換は `viewByEl` で行う
 *
 * 取得結果は document order で返す。
 * このクラスは状態更新と通知だけを担当し、見た目は CSS に任せる。
 */
export class AdvancedSearchSelection {
  private readonly _builder: AdvancedSearchBuilderView;
  private readonly _rootContainer: HTMLElement;

  constructor(builder: AdvancedSearchBuilderView) {
    this._builder = builder;
    this._rootContainer = selectRequired(
      this._builder.container,
      ROOT_CONTAINER_SEL
    );
  }

  /** 選択中の ConditionView を document order で返す。 */
  getSelectedConditionViews(): ConditionView[] {
    const els = Array.from(this._selectedNodeList());
    els.sort((a, b) => {
      const pos = a.compareDocumentPosition(b);
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      return 0;
    });
    return els
      .map((el) => viewByEl.get(el))
      .filter((v): v is ConditionView => !!v);
  }

  /**
   * View を選択する。
   *
   * 既存挙動に合わせ、複数選択は同じ親コンテナ配下だけに限定する。
   * `deselectSelecting` が true の場合は、選択前に既存選択をすべて解除する。
   */
  selectConditionView(
    view: ConditionView,
    deselectSelecting: boolean = true
  ): void {
    if (deselectSelecting) this.deselectAllConditions();

    const parentEl = view.rootEl.parentElement;
    const existing = this.getSelectedConditionViews();
    for (const v of existing) {
      if (v.rootEl.parentElement !== parentEl) this._unmarkSelected(v);
    }

    this._markSelected(view);
    this._notifyBuilder();
  }

  /** 指定した View の選択を解除する。 */
  deselectConditionView(view: ConditionView): void {
    this._unmarkSelected(view);
    this._notifyBuilder();
  }

  /** 管理範囲内の選択をすべて解除する。 */
  deselectAllConditions(): void {
    const nodes = this._selectedNodeList();
    nodes.forEach((el) => {
      const view = viewByEl.get(el as HTMLElement);
      if (view) this._unmarkSelected(view);
    });
    this._notifyBuilder();
  }

  /** 管理範囲内の選択中 DOM 要素を取得する。 */
  private _selectedNodeList(): NodeListOf<HTMLElement> {
    return this._rootContainer.querySelectorAll(SELECTED_SEL);
  }

  /** View と DOM の両方へ選択状態を反映する。 */
  private _markSelected(view: ConditionView): void {
    view.select();
    view.rootEl.setAttribute(ARIA_SELECTED, 'true');
  }

  /** View と DOM の両方から選択状態を外す。 */
  private _unmarkSelected(view: ConditionView): void {
    view.deselect();
    view.rootEl.removeAttribute(ARIA_SELECTED);
  }

  /** 選択状態の変更を Builder へ通知する。 */
  private _notifyBuilder(): void {
    this._builder.onSelectionChange(this.getSelectedConditionViews());
  }
}
