import type AdvancedSearchBuilderView from './AdvancedSearchBuilderView';
import type { ConditionView } from './Condition/ConditionView';

/**
 * Root container selector for the selection scope.
 * Targets elements under:
 * `.inner > .advanced-search-condition-group-view.-root > .container`
 */
const ROOT_SELECTOR =
  '#AdvancedSearchBuilderView > .inner > .advanced-search-condition-group-view.-root > .container';

/**
 * Common selector for *selected* elements (both group and item).
 * Selection is represented by `aria-selected="true"` and a CSS class.
 */
const SELECTED_SELECTOR =
  '.advanced-search-condition-group-view[aria-selected="true"], ' +
  '.advanced-search-condition-item-view[aria-selected="true"]';

/** CSS class name applied to selected elements. */
const SELECTED_CLASS = '-selected';

/** ARIA attribute used to indicate selection state. */
const ARIA_SELECTED = 'aria-selected';

/**
 * HTMLElement extended with a `delegate` reference to its corresponding ConditionView.
 */
type ConditionViewEl = HTMLElement & { delegate: ConditionView };
// export type ConditionViewEl = HTMLElement & { conditionView: ConditionView };

/**
 * Manages multi-selection for Advanced Search without relying on external selection libraries.
 *
 * The DOM itself is the single source of truth for selection state:
 * - Selected elements must expose a `delegate: ConditionView`.
 * - Selection is expressed via `aria-selected="true"` and the `-selected` class.
 *
 * @remarks
 * - Ordering: results are returned in **dom-sibling order**.
 * - Responsibility: This class only manages selection state & notifications; visuals are controlled by CSS.
 */
export class AdvancedSearchSelection {
  /** View that receives selection updates. */
  private readonly builder: AdvancedSearchBuilderView;

  /**
   * Creates a new selection manager.
   * @param builder - Target view that reacts to selection changes.
   */
  constructor(builder: AdvancedSearchBuilderView) {
    this.builder = builder;
  }

  /**
   * Returns the currently selected ConditionViews in **document order**.
   *
   * @returns Array of selected ConditionViews ordered by their position in the DOM.
   *
   * @example
   * const selected = selection.getSelectedConditionViews();
   * selected.forEach(v => v.highlight());
   */
  getSelectedConditionViews(): ConditionView[] {
    const els = this._getSelectedConditionElements();

    // Robust document-order sort.
    els.sort((a, b) => {
      if (a === b) return 0;
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1;
    });

    return els.map((el) => el.delegate);
    // return els.map((el) => el.conditionView);
  }

  /**
   * Selects the given view. Optionally clears the previous selection first.
   * Non-sibling selections will be deselected to preserve existing behavior.
   *
   * @param view - ConditionView to select.
   * @param deselectSelecting - If true, clears all current selections before selecting. Default: `true`.
   */
  selectConditionView(
    view: ConditionView,
    deselectSelecting: boolean = true
  ): void {
    if (deselectSelecting) this.deselectAllConditions();

    // Keep only sibling selections.
    const existing = this.getSelectedConditionViews();
    const siblings = view.siblingElms;
    existing.forEach((v) => {
      if (!siblings.includes(v.elm)) this.deselectConditionView(v);
    });

    // Update DOM state to "selected".
    view.select();
    view.elm.setAttribute(ARIA_SELECTED, 'true');
    view.elm.classList.add(SELECTED_CLASS);

    this._notifyBuilder();
  }

  /**
   * Deselects the given view.
   * @param view - ConditionView to deselect.
   */
  deselectConditionView(view: ConditionView): void {
    view.deselect();
    view.elm.removeAttribute(ARIA_SELECTED);
    view.elm.classList.remove(SELECTED_CLASS);

    this._notifyBuilder();
  }

  /**
   * Clears the selection for all currently selected elements.
   */
  deselectAllConditions(): void {
    this._getSelectedConditionElements().forEach((el) => {
      el.delegate.deselect();
      el.removeAttribute(ARIA_SELECTED);
      el.classList.remove(SELECTED_CLASS);
    });
    this._notifyBuilder();
  }

  /**
   * Retrieves selected **HTMLElement** nodes within the boundary that expose a `delegate`.
   * @returns Array of selected elements bearing a `delegate: ConditionView`.
   */
  private _getSelectedConditionElements(): ConditionViewEl[] {
    const rootEl = document.querySelector(ROOT_SELECTOR);
    if (!rootEl) return [];
    const nodeList = rootEl.querySelectorAll(SELECTED_SELECTOR);
    const selectedEls: ConditionViewEl[] = [];
    nodeList.forEach((el) => {
      if (isConditionViewEl(el)) selectedEls.push(el);
    });
    return selectedEls;
  }

  /**
   * Notifies the builder with the latest selection state.
   */
  private _notifyBuilder(): void {
    this.builder.onSelectionChange(this.getSelectedConditionViews());
  }
}

/**
 * Type guard to ensure an Element has a `delegate` pointing to a ConditionView.
 * @param el - Element to test.
 * @returns True if the element is a ConditionViewEl.
 */
function isConditionViewEl(el: Element): el is ConditionViewEl {
  return !!(el as any)?.delegate;
  // return !!(el as any)?.conditionView;
}
