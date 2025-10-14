import {
  type ConditionView,
  BaseConditionView,
  type GroupView,
  viewByEl,
} from './ConditionView';
import { ConditionItemView } from './ConditionItemView';
import type { AdvancedSearchBuilderView } from '../AdvancedSearchBuilderView';
import { CONDITION_NODE_KIND, type ConditionTypeValue } from '../../definition';
import type { ConditionQuery, LogicalOperator } from '../../types';
import { createEl } from '../../utils/dom/createEl';

/** Selector constants to avoid repetition and typos. */
const CHILD_VIEW_SEL = ':scope > .advanced-search-condition-view' as const;

/**
 * Manages a group of condition views (items or nested groups).
 * Handles logical-operator toggling, selection, and child lifecycle.
 */
export class ConditionGroupView extends BaseConditionView implements GroupView {
  readonly conditionNodeKind = CONDITION_NODE_KIND.group;

  private _isRoot: boolean; // root group cannot be selected or ungrouped

  // DOM refs
  private _logicalOperatorSwitch!: HTMLDivElement;
  private _childContainerEl!: HTMLDivElement; // implements GroupView.container

  private _mutationObserver!: MutationObserver; // Observes direct child-list

  private readonly _events = new AbortController(); // For controller to clean up

  /**
   * @param builder         Owning AdvancedSearchBuilderView
   * @param parentContainer Where this group's root element is inserted
   * @param logicalOperator Initial logical operator (and/or)
   * @param conditionViews  Optional initial children to move under this group
   * @param referenceElm    Insert this group before this node (or append when null)
   * @param isRoot          Whether this group is the top-level group
   */
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

    this._buildDOM(); // Create and cache DOM nodes
    this.logicalOperator = logicalOperator;
    this._attachEvents();

    // Move provided children under this group's container
    for (const cv of conditionViews) {
      this._childContainerEl.append(cv.rootEl);
    }

    // Observe changes to child list
    this._mutationObserver = this._createChildObserver();
    this._syncNumberOfChildren();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────────

  /** Create and append a toolbar container inside this group. */
  makeToolbar(): HTMLElement {
    const toolbar = createEl('nav', { class: 'advanced-search-toolbar-host' });
    this.rootEl.append(toolbar);
    return toolbar;
  }

  /** Add a new condition item as a direct child of this group. */
  addNewConditionItem(
    conditionType: ConditionTypeValue,
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

  /** Wrap given views into a new subgroup under this group. */
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

  /**
   * Ungroup this group: move its children to the parent group, then remove self.
   * No-op if no parent group.
   */
  ungroup(): void {
    const nodes = Array.from(
      this._childContainerEl.querySelectorAll(CHILD_VIEW_SEL)
    );
    const parent = this.parentGroup;
    if (parent) {
      parent.addConditionViews(nodes, this.rootEl);
    }
    this.remove(); // disconnects observer & listeners
  }

  /**
   * Insert existing view nodes before a reference element and refresh state.
   * Used by parent when "ungroup" moves descendants up one level.
   */
  addConditionViews(conditionViews: Node[], referenceElm: Node | null): void {
    for (const n of conditionViews) {
      this._childContainerEl.insertBefore(n, referenceElm);
    }
    this._syncNumberOfChildren();
  }

  /** Public API: remove one child view from DOM and refresh state. */
  removeConditionView(view: ConditionView): void {
    view.rootEl.remove(); // DOM を唯一のソースに
    this._syncNumberOfChildren(); // data-number-of-child を同期
  }

  /** Dispose this group and its resources. */
  remove(): void {
    this._mutationObserver?.disconnect();
    this._events.abort();
    super.remove();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Accessors
  // ───────────────────────────────────────────────────────────────────────────

  /** Direct container that holds child condition views (items or groups). */
  get container(): HTMLDivElement {
    return this._childContainerEl;
  }

  /**
   * Current children as live View instances.
   * DOM is the single source of truth; we resolve views via viewByEl.
   */
  get childViews(): ConditionView[] {
    return Array.from(this._childContainerEl.querySelectorAll(CHILD_VIEW_SEL))
      .map((el) => viewByEl.get(el as HTMLElement)!)
      .filter(Boolean);
  }

  /** Current logical operator, normalized to 'and' | 'or'. */
  get logicalOperator(): LogicalOperator {
    const op = (this._logicalOperatorSwitch.dataset.operator ??
      'and') as LogicalOperator;
    return op === 'or' ? 'or' : 'and';
  }
  set logicalOperator(op: LogicalOperator) {
    this._logicalOperatorSwitch.dataset.operator = op;
    // Reflect state for a11y: treat 'or' as checked=true.
    this._logicalOperatorSwitch.setAttribute(
      'aria-checked',
      String(op === 'or')
    );
  }

  /** Group-level query assembled from child queries. */
  get queryFragment(): ConditionQuery {
    const children = this.childViews;
    switch (children.length) {
      case 0:
        return {} as ConditionQuery;
      case 1:
        return children[0].queryFragment as ConditionQuery;
      default: {
        // Filter out null, undefined, and empty objects to prevent malformed queries
        const validFragments = children
          .map((v) => v.queryFragment)
          .filter((fragment) => {
            if (fragment == null) return false; // null or undefined
            if (
              typeof fragment === 'object' &&
              Object.keys(fragment).length === 0
            )
              return false; // empty object
            return true;
          });

        // If no valid fragments remain, return empty query
        if (validFragments.length === 0) {
          return {} as ConditionQuery;
        }

        // If only one valid fragment, return it directly (no need for logical operator wrapper)
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

  /** Create and cache the inner structure using createEl (no innerHTML). */
  private _buildDOM(): void {
    // Operator switch (use role="switch" for binary toggle; Space/Enter works nicely)
    this._logicalOperatorSwitch = createEl('div', {
      class: 'logical-operator-switch',
      attrs: {
        role: 'switch',
        'aria-label': 'Toggle logical operator',
        'aria-checked': 'false',
        tabindex: '0',
      },
    });

    // Children container
    this._childContainerEl = createEl('div', { class: 'container' });

    // Hydrate
    this.rootEl.replaceChildren(
      this._logicalOperatorSwitch,
      this._childContainerEl
    );
  }

  /** Wire up selection behavior and operator toggle (mouse + keyboard). */
  private _attachEvents(): void {
    const { signal } = this._events;

    // Background click toggles selection for non-root groups.
    if (!this._isRoot) {
      this.rootEl.addEventListener('click', this._toggleSelection.bind(this), {
        signal,
      });
    }

    // Toggle logical operator (mouse)
    this._logicalOperatorSwitch.addEventListener(
      'click',
      (e) => {
        e.stopPropagation();
        this.logicalOperator = this.logicalOperator === 'and' ? 'or' : 'and';
        this._notifyChanged();
      },
      { signal }
    );

    // Toggle logical operator (keyboard: Enter/Space)
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

  /** Notify the builder that this group's condition settings changed. */
  private _notifyChanged(): void {
    this._builder.changeCondition();
  }

  /**
   * Track child-list changes to keep count in sync and auto-ungroup small groups.
   * We disconnect before ungroup to avoid re-entrancy loops.
   */
  private _createChildObserver(): MutationObserver {
    const observer = new MutationObserver(() => {
      this._syncNumberOfChildren();
      if (!this._isRoot && this._numberOfChildren <= 1) {
        observer.disconnect();
        this.ungroup();
        // If this group still exists (rare), resume observing:
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

  /** Write data-number-of-child to match the current DOM count. */
  private _syncNumberOfChildren(): void {
    this.rootEl.dataset.numberOfChild = String(this._numberOfChildren);
  }

  /** Count children directly from DOM (single source of truth). */
  private get _numberOfChildren(): number {
    return this._childContainerEl.querySelectorAll(CHILD_VIEW_SEL).length;
  }
}
