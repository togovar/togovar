import {
  type ConditionView,
  BaseConditionView,
  type GroupView,
  viewByEl,
} from './ConditionView';
import ConditionItemView from './ConditionItemView';
import type AdvancedSearchBuilderView from '../AdvancedSearchBuilderView';
import { CONDITION_NODE_KIND } from '../../definition';

type MutationObserverInit = NonNullable<
  Parameters<MutationObserver['observe']>[1]
>;

export class ConditionGroupView extends BaseConditionView implements GroupView {
  readonly conditionNodeKind = CONDITION_NODE_KIND.group;

  private _isRoot: boolean;
  private _logicalOperatorSwitch: HTMLElement | null;
  private _container!: HTMLElement; // implements GroupView.container
  private _childViews: ConditionView[] = []; // implements GroupView.childViews
  private _mutationObserver!: MutationObserver; // ← 宣言を明示

  constructor(
    builder: AdvancedSearchBuilderView,
    parentContainer: HTMLElement,
    logicalOperator: string = 'and',
    conditionViews: ConditionView[] = [],
    referenceElm: Node | null = null,
    isRoot: boolean = false
  ) {
    super(builder, parentContainer, referenceElm);

    this._isRoot = isRoot;

    // ベースの要素(APIは this.elm / this._el)
    this.elm.classList.add('advanced-search-condition-group-view');
    if (isRoot) this.elm.classList.add('-root');

    this.elm.innerHTML = `
      <div class="logical-operator-switch"></div>
      <div class="container"></div>
    `;
    this._logicalOperatorSwitch = this.elm.querySelector(
      ':scope > .logical-operator-switch'
    );
    this._container = this.elm.querySelector(':scope > .container')!;

    // 初期子要素
    for (const cv of conditionViews) {
      this._container.append(cv.elm);
      this._childViews.push(cv);
    }

    // 演算子トグル & 選択イベント
    if (this._logicalOperatorSwitch) {
      this._logicalOperatorSwitch.dataset.operator = logicalOperator;

      if (!isRoot) {
        this.elm.addEventListener('click', this._toggleSelection.bind(this));
      }

      this._logicalOperatorSwitch.addEventListener('click', (e) => {
        e.stopImmediatePropagation();
        const cur = this._logicalOperatorSwitch!.dataset.operator ?? 'and';
        this._logicalOperatorSwitch!.dataset.operator =
          cur === 'and' ? 'or' : 'and';
        this._doneEditing();
      });
    }

    // 子数監視
    this._mutationObserver = this._defineObserveConditions();
    this._syncNumberOfChild();
    this.elm.dataset.numberOfChild = this._numberOfChild.toString();
  }

  private _doneEditing(): void {
    this._builder.changeCondition();
  }

  // ========= public API =========

  makeToolbar(): HTMLElement {
    const toolbar = document.createElement('nav');
    this.elm.append(toolbar);
    return toolbar;
  }

  addNewConditionItem(
    conditionType: string,
    options: any,
    referenceElm: Node | null = null
  ): ConditionItemView {
    const item = new ConditionItemView(
      this._builder,
      this,
      conditionType,
      options,
      referenceElm
    );
    this._childViews.push(item); // ← 追跡
    this._syncNumberOfChild();
    return item;
  }

  addNewConditionGroup(
    selected: ConditionView[],
    ref?: HTMLElement | null
  ): GroupView {
    const group = new ConditionGroupView(
      this._builder,
      this._container,
      'and',
      selected,
      ref ?? null,
      false
    );
    this._childViews.push(group); // ← 追跡
    this._syncNumberOfChild();
    return group;
  }

  ungroup(): void {
    const nodes = Array.from(
      this._container?.querySelectorAll(
        ':scope > .advanced-search-condition-view'
      ) ?? []
    );

    const parent = this.parentView; // GroupView | null
    if (parent) {
      parent.addConditionViews(nodes, this.elm);
    }
    this.remove(); // ↓ override で observer を止めてから super.remove()
  }

  addConditionViews(conditionViews: Node[], referenceElm: Node | null): void {
    for (const n of conditionViews) {
      this._container?.insertBefore(n, referenceElm);
    }
    // childViews の再構築（WeakMap から拾い直す）
    this._childViews = Array.from(
      this._container.querySelectorAll(
        ':scope > .advanced-search-condition-view'
      )
    )
      .map((el) => viewByEl.get(el as HTMLElement)!)
      .filter(Boolean);

    this._syncNumberOfChild();
  }

  removeConditionView(view: ConditionView): void {
    const idx = this._childViews.indexOf(view);
    if (idx >= 0) this._childViews.splice(idx, 1);
    view.elm.remove();
    this.elm.dataset.numberOfChild = this._numberOfChild.toString();

    this._syncNumberOfChild();
  }

  /** Group 自身を除去（Observer を止めた上で親へ通知 & DOM 破棄） */
  remove(): void {
    this._mutationObserver?.disconnect();
    super.remove(); // BaseConditionView.remove()
  }

  // ========= internal =========

  // MutationObserver のコールバック
  private _defineObserveConditions(): MutationObserver {
    const config: MutationObserverInit = {
      attributes: false,
      childList: true,
      subtree: false,
    };
    const observer = new MutationObserver(() => {
      this._syncNumberOfChild(); // ★ DOM変化でも同期
      if (!this._isRoot && this._numberOfChild <= 1) this.ungroup();
    });
    observer.observe(this._container, config);
    return observer;
  }

  private _syncNumberOfChild(): void {
    const count =
      this._container?.querySelectorAll(
        ':scope > .advanced-search-condition-view'
      ).length ?? 0;
    this.elm.dataset.numberOfChild = String(count); // ← data-number-of-child を更新
  }

  // ========= accessors =========

  get query(): object {
    const children = Array.from(
      this._container?.querySelectorAll(
        ':scope > .advanced-search-condition-view'
      ) ?? []
    ) as HTMLElement[];

    switch (this._numberOfChild) {
      case 0:
        return {};
      case 1: {
        const v = viewByEl.get(children[0]);
        if (!v) throw new Error('View not found for the first child');
        return v.query;
      }
      default: {
        const op = this._logicalOperatorSwitch?.dataset.operator || 'and';
        return {
          [op]: children.map((el) => {
            const v = viewByEl.get(el);
            if (!v) throw new Error('View not found for a child');
            return v.query;
          }),
        };
      }
    }
  }

  get container(): HTMLElement {
    return this._container;
  }

  get childViews(): ConditionView[] {
    return this._childViews;
  }

  private get _numberOfChild(): number {
    return (
      this._container?.querySelectorAll(
        ':scope > .advanced-search-condition-view'
      ).length ?? 0
    );
  }
}
