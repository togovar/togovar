import { selectRequired } from '../utils/dom/select';
import type { AdvancedSearchBuilderView } from './AdvancedSearchBuilderView';
import { type ConditionView, viewByEl } from './Condition/ConditionView';

/** CSS selector for “selected” views (group or item share this base class). */
const SELECTED_SEL =
  '.advanced-search-condition-view[aria-selected="true"]' as const;

/** ARIA attribute used to indicate selection state. */
const ARIA_SELECTED = 'aria-selected';

const ROOT_CONTAINER_SEL =
  ':scope > .advanced-search-condition-group-view.-root > .container' as const;

/**
 * Manages multi-selection for Advanced Search.
 *
 * Source of truth is the DOM:
 * - Selected elements are marked with `aria-selected="true"`.
 * - We resolve DOM → View via the global `viewByEl` map (no custom HTMLElement fields).
 *
 * Results are returned in **document order**.
 * This class only manages state & notifications; visuals are handled by CSS.
 */
export class AdvancedSearchSelection {
  private readonly _builder: AdvancedSearchBuilderView; // Owning view that reacts to selection changes.
  private readonly _rootContainer: HTMLElement;

  constructor(builder: AdvancedSearchBuilderView) {
    this._builder = builder;
    this._rootContainer = selectRequired(
      this._builder.container,
      ROOT_CONTAINER_SEL
    );
  }

  /** Return selected ConditionView instances in document order. */
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
   * Select a view. Optionally clear previous selection.
   * To preserve legacy behavior, we only keep selections under the **same parent container**.
   */
  selectConditionView(
    view: ConditionView,
    deselectSelecting: boolean = true
  ): void {
    if (deselectSelecting) this.deselectAllConditions();

    // Keep only sibling selections (same parent element).
    const parentEl = view.rootEl.parentElement;
    const existing = this.getSelectedConditionViews();
    for (const v of existing) {
      if (v.rootEl.parentElement !== parentEl) this._unmarkSelected(v);
    }

    this._markSelected(view);
    this._notifyBuilder();
  }

  /** Deselect a single view. */
  deselectConditionView(view: ConditionView): void {
    this._unmarkSelected(view);
    this._notifyBuilder();
  }

  /** Deselect all selected views within the boundary. */
  deselectAllConditions(): void {
    const nodes = this._selectedNodeList();
    nodes.forEach((el) => {
      const view = viewByEl.get(el as HTMLElement);
      if (view) this._unmarkSelected(view);
    });
    this._notifyBuilder();
  }

  // ─────────────────────────────────────────────────────────
  // Internals
  // ─────────────────────────────────────────────────────────

  /** Query selected elements under the boundary. */
  private _selectedNodeList(): NodeListOf<HTMLElement> {
    return this._rootContainer.querySelectorAll(SELECTED_SEL);
  }

  /** Apply selected state to DOM + delegate. */
  private _markSelected(view: ConditionView): void {
    view.select();
    view.rootEl.setAttribute(ARIA_SELECTED, 'true');
  }

  /** Remove selected state from DOM + delegate. */
  private _unmarkSelected(view: ConditionView): void {
    view.deselect();
    view.rootEl.removeAttribute(ARIA_SELECTED);
  }

  /** Notify the builder that the selection has changed. */
  private _notifyBuilder(): void {
    this._builder.onSelectionChange(this.getSelectedConditionViews());
  }
}
