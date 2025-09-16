import {
  type ConditionView,
  BaseConditionView,
  type GroupView,
  viewByEl,
} from './ConditionView';
import { selectRequired } from '../../utils/dom/select';
import { ConditionItemView } from './ConditionItemView';
import type AdvancedSearchBuilderView from '../AdvancedSearchBuilderView';
import { CONDITION_NODE_KIND, type ConditionTypeValue } from '../../definition';
import type { ConditionQuery } from '../../types';

/** Logical operator used to combine child conditions. */
type LogicalOperator = 'and' | 'or';

/** Selector constants to avoid repetition and typos. */
const SELECTOR = {
  operatorSwitch: ':scope > .logical-operator-switch',
  container: ':scope > .container',
  childView: ':scope > .advanced-search-condition-view',
} as const;

/**
 * Manages a group of condition views (items or nested groups).
 * Handles logical operator toggling, selection, and child lifecycle.
 */
export class ConditionGroupView extends BaseConditionView implements GroupView {
  readonly conditionNodeKind = CONDITION_NODE_KIND.group;

  private _isRoot: boolean;
  private _logicalOperatorSwitch!: HTMLDivElement;
  private _container!: HTMLDivElement; // implements GroupView.container
  private _childViews: ConditionView[] = []; // implements GroupView.childViews
  private _mutationObserver!: MutationObserver; // observes child list changes
  private readonly _events = new AbortController(); // for bulk listener cleanup

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

    // Base element
    this.rootEl.classList.add('advanced-search-condition-group-view');
    if (isRoot) this.rootEl.classList.add('-root');

    // Static template
    this.rootEl.innerHTML = `
      <div class="logical-operator-switch" role="button" aria-label="Toggle logical operator"></div>
      <div class="container"></div>
    `;

    // Cache required elements
    this._logicalOperatorSwitch = selectRequired<HTMLDivElement>(
      this.rootEl,
      SELECTOR.operatorSwitch
    );
    this._container = selectRequired<HTMLDivElement>(
      this.rootEl,
      SELECTOR.container
    );

    // Initialize children (DOM nodes are already owned by each child's rootEl)
    for (const cv of conditionViews) {
      this._container.append(cv.rootEl);
      this._childViews.push(cv);
    }

    // Initialize operator and wire events
    this.logicalOperator = logicalOperator;
    this._attachEvents();

    // Observe child list to keep count in sync and auto-ungroup when needed
    this._mutationObserver = this._createChildObserver();
    this._syncNumberOfChildren();
    this.rootEl.dataset.numberOfChild = this._numberOfChildren.toString();
  }

  /** Public API: create and append a toolbar element. */
  makeToolbar(): HTMLElement {
    const toolbar = document.createElement('nav');
    this.rootEl.append(toolbar);
    return toolbar;
  }

  /** Public API: add a new condition item as a child. */
  addNewConditionItem(
    conditionType: ConditionTypeValue,
    _options?: unknown,
    referenceElm: Node | null = null
  ): ConditionItemView {
    const item = new ConditionItemView(
      this._builder,
      this,
      conditionType,
      referenceElm
    );
    this._childViews.push(item);
    this._syncNumberOfChildren();
    return item;
  }

  /** Public API: wrap selected views into a new subgroup. */
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
    this._childViews.push(group);
    this._syncNumberOfChildren();
    return group;
  }

  /** Public API: remove this group but keep (move) its children to the parent group. */
  ungroup(): void {
    const nodes = Array.from(
      this._container.querySelectorAll(SELECTOR.childView)
    );
    const parent = this.parentGroup; // GroupView | null
    if (parent) {
      parent.addConditionViews(nodes, this.rootEl);
    }
    // Disconnect observer first, then remove self
    this.remove();
  }

  /** Public API: insert existing views before a reference element and rebuild the cache. */
  addConditionViews(conditionViews: Node[], referenceElm: Node | null): void {
    for (const n of conditionViews) {
      this._container.insertBefore(n, referenceElm);
    }
    // Rebuild childViews cache from DOM using the global view map
    this._childViews = Array.from(
      this._container.querySelectorAll(SELECTOR.childView)
    )
      .map((el) => viewByEl.get(el as HTMLElement)!)
      .filter(Boolean);

    this._syncNumberOfChildren();
  }

  /** Public API: remove one child view from both DOM and local cache. */
  removeConditionView(view: ConditionView): void {
    const idx = this._childViews.indexOf(view);
    if (idx >= 0) this._childViews.splice(idx, 1);
    view.rootEl.remove();
    this.rootEl.dataset.numberOfChild = this._numberOfChildren.toString();
    this._syncNumberOfChildren();
  }

  /** Public API: dispose group and its resources. */
  remove(): void {
    this._mutationObserver?.disconnect();
    this._events.abort();
    super.remove(); // BaseConditionView.remove()
  }

  // ========== Accessors ==========

  /** Group-level query assembled from child queries. */
  get queryFragment(): ConditionQuery {
    const children = Array.from(
      this._container.querySelectorAll(SELECTOR.childView)
    ) as HTMLElement[];

    switch (this._numberOfChildren) {
      case 0:
        return {} as ConditionQuery;
      case 1: {
        const v = viewByEl.get(children[0]);
        if (!v) throw new Error('View not found for the first child');
        return v.queryFragment as ConditionQuery;
      }
      default: {
        const op = this.logicalOperator;
        return {
          [op]: children.map((el) => {
            const v = viewByEl.get(el);
            if (!v) throw new Error('View not found for a child');
            return v.queryFragment;
          }),
        } as ConditionQuery;
      }
    }
  }

  /** Container element that holds child condition views. */
  get container(): HTMLDivElement {
    return this._container;
  }

  /** Cached child view instances (items or nested groups). */
  get childViews(): ConditionView[] {
    return this._childViews;
  }

  /** Current logical operator based on the switch's dataset. */
  get logicalOperator(): LogicalOperator {
    const op = (this._logicalOperatorSwitch.dataset.operator ??
      'and') as LogicalOperator;
    return op === 'or' ? 'or' : 'and';
  }
  set logicalOperator(op: LogicalOperator) {
    this._logicalOperatorSwitch.dataset.operator = op;
  }

  // ========== Internals ==========

  /** Attach all event listeners (selection toggle, operator toggle). */
  private _attachEvents(): void {
    const { signal } = this._events;

    // Root click toggles selection (except for the root-most group)
    if (!this._isRoot) {
      this.rootEl.addEventListener('click', this._toggleSelection.bind(this), {
        signal,
      });
    }

    // Toggle logical operator without bubbling to parents
    this._logicalOperatorSwitch.addEventListener(
      'click',
      (e) => {
        e.stopImmediatePropagation();
        this.logicalOperator = this.logicalOperator === 'and' ? 'or' : 'and';
        this._notifyChanged();
      },
      { signal }
    );
  }

  /** Notify the builder that this group’s condition settings changed. */
  private _notifyChanged(): void {
    this._builder.changeCondition();
  }

  /** Create a MutationObserver that tracks child list changes. */
  private _createChildObserver(): MutationObserver {
    const config: MutationObserverInit = {
      attributes: false,
      childList: true,
      subtree: false,
    };
    const observer = new MutationObserver(() => {
      this._syncNumberOfChildren();
      // Auto-ungroup when a non-root group ends up with <=1 child
      if (!this._isRoot && this._numberOfChildren <= 1) this.ungroup();
    });
    observer.observe(this._container, config);
    return observer;
  }

  /** Update data-number-of-child to match the current DOM. */
  private _syncNumberOfChildren(): void {
    const count = this._container.querySelectorAll(SELECTOR.childView).length;
    this.rootEl.dataset.numberOfChild = String(count);
  }

  /** Count children directly from DOM (source of truth). */
  private get _numberOfChildren(): number {
    return this._container.querySelectorAll(SELECTOR.childView).length;
  }
}
