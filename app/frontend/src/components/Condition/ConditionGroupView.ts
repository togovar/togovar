import {
  type ConditionView,
  BaseConditionView,
  type GroupView,
  viewByEl,
} from './ConditionView';
import { ConditionItemView } from './ConditionItemView';
import type { AdvancedSearchBuilderView } from '../AdvancedSearch/AdvancedSearchBuilderView';
import { CONDITION_NODE_KIND, type AdvancedConditionTypeValue } from '../../advancedCondition';
import type { ConditionQuery, LogicalOperator } from '../../types';
import { createEl } from '../../utils/dom/createEl';

// タイポ防止のため定数化。selector を変える場合は1箇所だけ修正すれば済む。
const CHILD_VIEW_SEL = ':scope > .advanced-search-condition-view' as const;

/**
 * AND/OR の論理グループを管理する View。
 *
 * 子Viewの追加・削除・ungroup・選択状態の通知を担う。
 * 子が1件以下になると自動的に ungroup するが、URL復元中は
 * suspendAutoUngroup() で一時停止できる。
 */
export class ConditionGroupView extends BaseConditionView implements GroupView {
  readonly conditionNodeKind = CONDITION_NODE_KIND.group;

  // ルートグループは選択・ungroup の対象外にする。
  private _isRoot: boolean;

  private _logicalOperatorSwitch!: HTMLDivElement;
  private _childContainerEl!: HTMLDivElement;

  private _mutationObserver!: MutationObserver;
  private _isAutoUngroupSuspended = false;

  private readonly _events = new AbortController();

  constructor(
    builder: AdvancedSearchBuilderView,
    parentContainer: HTMLElement,
    logicalOperator: LogicalOperator = 'and',
    conditionViews: ConditionView[] = [],
    referenceElm: Node | null = null,
    isRoot: boolean = false
  ) {
    super(builder, parentContainer, referenceElm);
    this._isRoot = isRoot;

    this.rootEl.classList.add('advanced-search-condition-group-view');
    if (isRoot) this.rootEl.classList.add('-root');

    this._buildDOM();
    this.logicalOperator = logicalOperator;
    this._attachEvents();

    for (const cv of conditionViews) {
      this._childContainerEl.append(cv.rootEl);
    }

    this._mutationObserver = this._createChildObserver();
    this._syncNumberOfChildren();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────────

  /** ToolbarのホストをこのグループのrootEl末尾に追加して返す。 */
  makeToolbar(): HTMLElement {
    const toolbar = createEl('nav', { class: 'advanced-search-toolbar-host' });
    this.rootEl.append(toolbar);
    return toolbar;
  }

  /** 指定した条件種別の新しい条件行をこのグループ内に追加する。 */
  addNewConditionItem(
    conditionType: AdvancedConditionTypeValue,
    referenceElm: Node | null = null,
    options?: unknown
  ): ConditionItemView {
    const item = new ConditionItemView(
      this._builder,
      this,
      conditionType,
      referenceElm,
      options
    );
    this._syncNumberOfChildren();
    return item;
  }

  /** URLなどから復元するときに、空の子グループを追加する。 */
  addEmptyConditionGroup(
    logicalOperator: LogicalOperator = 'and',
    referenceElm: Node | null = null
  ): ConditionGroupView {
    const group = new ConditionGroupView(
      this._builder,
      this._childContainerEl,
      logicalOperator,
      [],
      referenceElm,
      false
    );
    this._syncNumberOfChildren();
    return group;
  }

  /** 選択中の Viewを新しいサブグループで包む。 */
  addNewConditionGroup(
    selected: ConditionView[],
    ref?: HTMLElement | null
  ): GroupView {
    const group = new ConditionGroupView(
      this._builder,
      this._childContainerEl,
      'and',
      selected,
      ref ?? null,
      false
    );
    this._syncNumberOfChildren();
    return group;
  }

  /** このグループ直下の条件をすべて削除する。 */
  clearConditionViews(): void {
    for (const view of [...this.childViews]) {
      view.remove();
    }
    this._syncNumberOfChildren();
  }

  /**
   * 子要素をまとめて追加している間だけ自動Ungroupを止める。
   *
   * URL復元で複数の子を順番に追加する際、途中の「子1件」状態で
   * ungroup が走ってしまうのを防ぐために使う。
   * 返り値の関数を呼ぶと再開し、その時点の件数でungroup判定を行う。
   */
  suspendAutoUngroup(): () => void {
    this._isAutoUngroupSuspended = true;

    return () => {
      this._isAutoUngroupSuspended = false;
      this._syncNumberOfChildren();
      if (!this._isRoot && this._numberOfChildren <= 1) {
        this.ungroup();
      }
    };
  }

  /** 子ViewをすべてParentへ移動してから自身を削除する。 */
  ungroup(): void {
    const nodes = Array.from(
      this._childContainerEl.querySelectorAll(CHILD_VIEW_SEL)
    );
    const parent = this.parentGroup;
    if (parent) {
      parent.addConditionViews(nodes, this.rootEl);
    }
    this.remove();
  }

  /**
   * 既存のViewノードを参照要素の直前に挿入する。
   * ungroupで子要素を上位グループへ移動するときに呼ばれる。
   */
  addConditionViews(conditionViews: Node[], referenceElm: Node | null): void {
    for (const n of conditionViews) {
      this._childContainerEl.insertBefore(n, referenceElm);
    }
    this._syncNumberOfChildren();
  }

  /** 指定した子Viewを削除する。削除後に件数を同期してungroup判定を発火させる。 */
  removeConditionView(view: ConditionView): void {
    view.rootEl.remove();
    this._syncNumberOfChildren();
  }

  /** MutationObserverとイベントを解除してからViewを削除する。先に切断しないとungroup二重呼び出しが起きる。 */
  remove(): void {
    this._mutationObserver?.disconnect();
    this._events.abort();
    super.remove();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Accessors
  // ───────────────────────────────────────────────────────────────────────────

  /** 子Viewを配置するコンテナ要素。addConditionViewsなどで子を挿入するために参照する。 */
  get container(): HTMLDivElement {
    return this._childContainerEl;
  }

  /**
   * 子Viewの一覧。DOMを正本として viewByEl 経由で解決する。
   * インメモリのキャッシュを持たないことで、DOM操作後のズレを防ぐ。
   */
  get childViews(): ConditionView[] {
    return Array.from(this._childContainerEl.querySelectorAll(CHILD_VIEW_SEL))
      .map((el) => viewByEl.get(el as HTMLElement)!)
      .filter(Boolean);
  }

  /** DOM（data-operator属性）を正本とすることで、シリアライズ後の復元でもズレが起きない。 */
  get logicalOperator(): LogicalOperator {
    const op = (this._logicalOperatorSwitch.dataset.operator ??
      'and') as LogicalOperator;
    return op === 'or' ? 'or' : 'and';
  }
  /** data-operatorとaria-checkedを同時に更新してDOMとARIAの整合性を保つ。 */
  set logicalOperator(op: LogicalOperator) {
    this._logicalOperatorSwitch.dataset.operator = op;
    // aria-checked: 'or' を "チェック済み" として扱い、スクリーンリーダーへ伝える。
    this._logicalOperatorSwitch.setAttribute(
      'aria-checked',
      String(op === 'or')
    );
  }

  /** 子Viewのqueryを集約してグループのqueryを組み立てる。 */
  get queryFragment(): ConditionQuery {
    const children = this.childViews;
    switch (children.length) {
      case 0:
        return {} as ConditionQuery;
      case 1:
        return children[0].queryFragment as ConditionQuery;
      default: {
        // 空オブジェクトや null/undefined は不正なqueryになるため除外する。
        const validFragments = children
          .map((v) => v.queryFragment)
          .filter((fragment) => {
            if (fragment == null) return false;
            if (
              typeof fragment === 'object' &&
              Object.keys(fragment).length === 0
            )
              return false;
            return true;
          });

        if (validFragments.length === 0) {
          return {} as ConditionQuery;
        }

        // 有効なfragmentが1件のみなら、論理演算子で包む必要がない。
        if (validFragments.length === 1) {
          return validFragments[0] as ConditionQuery;
        }

        return {
          [this.logicalOperator]: validFragments,
        } as ConditionQuery;
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Internals
  // ───────────────────────────────────────────────────────────────────────────

  private _buildDOM(): void {
    // role="switch" を使うことで Enter/Space によるキーボード操作がブラウザ標準で動く。
    this._logicalOperatorSwitch = createEl('div', {
      class: 'logical-operator-switch',
      attrs: {
        role: 'switch',
        'aria-label': 'Toggle logical operator',
        'aria-checked': 'false',
        tabindex: '0',
      },
    });

    this._childContainerEl = createEl('div', { class: 'container' });

    this.rootEl.replaceChildren(
      this._logicalOperatorSwitch,
      this._childContainerEl
    );
  }

  /** クリック・キーボードのイベントを登録する。ルートグループは選択対象外のためclickを登録しない。 */
  private _attachEvents(): void {
    const { signal } = this._events;

    if (!this._isRoot) {
      this.rootEl.addEventListener('click', this._toggleSelection.bind(this), {
        signal,
      });
    }

    this._logicalOperatorSwitch.addEventListener(
      'click',
      (e) => {
        e.stopPropagation();
        this.logicalOperator = this.logicalOperator === 'and' ? 'or' : 'and';
        this._notifyChanged();
      },
      { signal }
    );

    this._logicalOperatorSwitch.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          this.logicalOperator = this.logicalOperator === 'and' ? 'or' : 'and';
          this._notifyChanged();
        }
      },
      { signal }
    );
  }

  /** 論理演算子の切り替えをBuilderへ伝えて検索クエリの再構築を促す。 */
  private _notifyChanged(): void {
    this._builder.changeCondition();
  }

  /**
   * 子リストの変化を監視し、件数が1以下になったら自動でungroupする。
   *
   * ungroup前にObserverを切ることで、ungroup処理が引き起こす
   * DOM変化がこのコールバックへ再入するのを防ぐ。
   */
  private _createChildObserver(): MutationObserver {
    const observer = new MutationObserver(() => {
      this._syncNumberOfChildren();
      if (
        !this._isRoot &&
        !this._isAutoUngroupSuspended &&
        this._numberOfChildren <= 1
      ) {
        observer.disconnect();
        this.ungroup();
        if (this.rootEl.isConnected) {
          observer.observe(this._childContainerEl, {
            childList: true,
            subtree: false,
          });
        }
      }
    });
    observer.observe(this._childContainerEl, {
      childList: true,
      subtree: false,
    });
    return observer;
  }

  /** data-number-of-child を実際のDOM件数と同期する。CSSセレクターから参照される。 */
  private _syncNumberOfChildren(): void {
    this.rootEl.dataset.numberOfChild = String(this._numberOfChildren);
  }

  /** DOMを正本として子件数を数える。 */
  private get _numberOfChildren(): number {
    return this._childContainerEl.querySelectorAll(CHILD_VIEW_SEL).length;
  }
}
