import { setAdvancedSearchCondition } from '../store/searchManager';
import { ConditionGroupView } from './Condition/ConditionGroupView';
import type { ConditionView } from './Condition/ConditionView';
import { AdvancedSearchToolbar } from './AdvancedSearchToolbar';
import { AdvancedSearchSelection } from './AdvancedSearchSelection';
import { CONDITION_ITEM_TYPE } from '../definition.js';

/** Capability flags derived from the current selection. */
type SelectionCapabilities = {
  canDelete: boolean;
  canGroup: boolean;
  canUngroup: boolean;
  canCopy: boolean;
};

export default class AdvancedSearchBuilderView {
  _advancedSearchBuilderEl: HTMLElement;
  _container: HTMLElement;
  _rootGroup: ConditionGroupView;
  _toolbar: AdvancedSearchToolbar;
  _selection: AdvancedSearchSelection;

  constructor(advancedSearchBuilderEl: HTMLElement) {
    this._advancedSearchBuilderEl = advancedSearchBuilderEl;
    this._container = advancedSearchBuilderEl.querySelector(
      ':scope > .inner'
    ) as HTMLElement;
    this._rootGroup = new ConditionGroupView(
      this as AdvancedSearchBuilderView,
      this as any,
      'and',
      [],
      null,
      true
    );
    this._toolbar = new AdvancedSearchToolbar(
      this as AdvancedSearchBuilderView,
      this._rootGroup.makeToolbar()
    );
    // this._defineEvents();

    this._selection = new AdvancedSearchSelection(this);
  }

  onSelectionChange(selection: ConditionView[]): void {
    // change status
    // let canUngroup = false;
    // let canCopy = false;
    // if (conditionViews.length === 1) {
    //   canUngroup = conditionViews[0].type === CONDITION_ITEM_TYPE.group;
    //   canCopy = conditionViews[0].type === CONDITION_ITEM_TYPE.condition;
    // }
    // // can delete
    // this._elm.dataset.canDelete = conditionViews.length > 0;
    // // can group
    // this._elm.dataset.canGroup =
    //   conditionViews.length > 1 &&
    //   conditionViews[0].siblingElms.length > conditionViews.length;
    // // can ungroup
    // this._elm.dataset.canUngroup = canUngroup;
    // // can copy
    // this._elm.dataset.canCopy = canCopy;

    // this._advancedSearchBuilderEl.dataset.canDelete = String(
    //   selection.length > 0
    // );
    // this._advancedSearchBuilderEl.dataset.canGroup = String(
    //   selection.length > 1
    // );
    // const canUngroup = selection.some((view) => view.canUngroup);
    // this._advancedSearchBuilderEl.dataset.canUngroup = String(canUngroup);
    // const canCopy = selection.some((view) => view.canCopy);
    // this._advancedSearchBuilderEl.dataset.canCopy = String(canCopy);

    // ----------------
    const caps = this._computeSelectionCapabilities(selection);
    this._applyCapabilitiesToDataset(caps);
  }

  // ================================
  // Capability computation & apply
  // ================================

  /**
   * Computes capability flags (canDelete, canGroup, canUngroup, canCopy)
   * from the current selection. Pure function — no side effects.
   *
   * Rules (restoring and strengthening the original commented logic):
   * - canDelete: true if at least one item is selected.
   * - canGroup:
   *    - at least 2 items selected,
   *    - all selected items share the same parent group,
   *    - not all children of that parent are selected (i.e., grouping the entire set is disallowed).
   * - canUngroup: true only when exactly one view is selected and it is (or reports) a group.
   * - canCopy: true only when exactly one view is selected and it is (or reports) a condition item.
   *
   * @param selection - The current selection.
   * @returns Capability flags derived from the selection.
   */
  private _computeSelectionCapabilities(
    selection: ConditionView[]
  ): SelectionCapabilities {
    const selectionLength = selection.length;

    // --- canUngroup (single selection & group) ---
    const canUngroup =
      selectionLength === 1 &&
      // prefer explicit capability if available
      ((selection[0] as any)?.canUngroup === true ||
        // fallback to type check
        selection[0].type === CONDITION_ITEM_TYPE.group);

    // --- canGroup (>=2, same parent, not all children selected) ---
    let canGroup = false;
    if (selectionLength > 1) {
      const firstParent = selection[0].parentView ?? null;
      // all selected must share the same parent group
      const sameParent =
        !!firstParent && selection.every((v) => v.parentView === firstParent);

      if (sameParent) {
        // Prefer the canonical source of children on the parent group if available.
        // Fallback to the legacy sibling list if needed.
        const totalChildren = Array.isArray((firstParent as any)?.childViews)
          ? (firstParent as any).childViews.length
          : Array.isArray((selection[0] as any)?.siblingElms)
          ? (selection[0] as any).siblingElms.length + 1 // +1 for self
          : Number.POSITIVE_INFINITY; // if unknown, do not block grouping

        const notAllSelected = selectionLength < totalChildren;
        canGroup = sameParent && notAllSelected;
      }
    }

    // --- canDelete ---
    const canDelete = selectionLength > 0;

    // --- canCopy (single selection & condition item) ---
    const canCopy =
      selectionLength === 1 &&
      ((selection[0] as any)?.canCopy === true ||
        selection[0].type === CONDITION_ITEM_TYPE.condition);

    return { canDelete, canGroup, canUngroup, canCopy };
  }

  /**
   * Applies capability flags to the root element via data-* attributes.
   * (CSS may toggle styles/visibility based on these.)
   *
   * @param caps - Capability flags computed from the current selection.
   */
  private _applyCapabilitiesToDataset(caps: SelectionCapabilities): void {
    // Note: dataset expects strings.
    this._advancedSearchBuilderEl.dataset.canDelete = String(caps.canDelete);
    this._advancedSearchBuilderEl.dataset.canGroup = String(caps.canGroup);
    this._advancedSearchBuilderEl.dataset.canUngroup = String(caps.canUngroup);
    this._advancedSearchBuilderEl.dataset.canCopy = String(caps.canCopy);
  }

  changeCondition() {
    this.search();
  }

  /**
   * Groups the currently selected condition views into a new condition group.
   *
   * This method identifies the parent group of the selected condition views,
   * determines the insertion position for the new group, and creates a new
   * condition group containing the selected views. The new group is then
   * selected, and the condition state is updated.
   */
  group(): void {
    const selectedViews: ConditionView[] =
      this._selection.getSelectedConditionViews();

    if (selectedViews.length === 0) {
      throw new Error('No condition views selected to group.');
    }

    const parentGroupView = selectedViews[0].parentView;
    if (!parentGroupView) {
      throw new Error(
        'Parent group view not found for the selected condition views.'
      );
    }

    const childViewsOfParent: ConditionView[] = parentGroupView.childViews;
    let minIndex = Number.POSITIVE_INFINITY;
    let insertionPointEl: HTMLElement | null = null;

    // Determine the insertion position and reference element
    for (const view of selectedViews) {
      const idx = childViewsOfParent.indexOf(view);
      if (idx !== -1 && idx < minIndex) {
        minIndex = idx;
        insertionPointEl = view.elm;
      }
    }

    // Add new group
    const newGroup = parentGroupView.addNewConditionGroup(
      selectedViews,
      insertionPointEl
    );

    // Select the new group and update the condition state
    this._selection.selectConditionView(newGroup, true);
    this.changeCondition();
  }

  ungroup() {
    const conditionViews = this._selection.getSelectedConditionViews();
    // deselect selecting group
    conditionViews.forEach((conditionView) => {
      this._selection.deselectConditionView(conditionView);
    });
    // ungroup
    conditionViews[0].ungroup();
    this.changeCondition();
  }

  // copy() {
  //   console.log('_copy')
  //   const selectingConditionViews = this._selection.getSelectingConditionViews();
  //   // TODO:
  //   this.changeCondition();
  // }

  // edit() {
  //   console.log('_edit')
  //   this.changeCondition();
  // }

  /**
   *
   * @param {Array<ConditionView>} views
   */
  deleteCondition(views?: any[]): void {
    views = views ?? this._selection.getSelectedConditionViews();
    for (const view of views) {
      view.remove();
      this._selection.deselectConditionView(view);
    }
    this.changeCondition();
  }

  search() {
    const query = this._rootGroup.query;

    setAdvancedSearchCondition(query);
  }

  // add search condition to the currently selected layer
  addCondition(conditionType: string, options: any): void {
    // get selecting condition
    const selectingConditionViews = this._selection.getSelectedConditionViews();
    const selectingConditionView =
      selectingConditionViews.length > 0
        ? selectingConditionViews[0]
        : this._rootGroup;

    // release exist conditions
    this._selection.deselectAllConditions();

    // add
    switch (selectingConditionView.type) {
      case CONDITION_ITEM_TYPE.condition:
        // TODO: コンディションを選択していた場合に、その後ろに新規条件を追加
        break;
      case CONDITION_ITEM_TYPE.group:
        selectingConditionView.addNewConditionItem(conditionType, options);
        break;
    }
  }

  // private methods
  // _defineEvents() {
  //   let downX, downY;
  //   this._elm.addEventListener('mousedown', (e) => {
  //     [downX, downY] = [e.x, e.y];
  //   });
  //   this._elm.addEventListener('click', (e) => {
  //     if (Math.abs(downX - e.x) > 2 || Math.abs(downY - e.y) > 2) return;
  //     e.stopImmediatePropagation();
  //     this._selection.deselectAllConditions();
  //   });
  // }

  // Rewroted _defineEvents(), but it doesn't work, so it needs fixing.
  // /** Call once after construction */
  // private _defineEvents(): void {
  //   this._bindBackgroundDeselect();
  // }

  // /**
  //  * Binds "background click" to clear the current selection.
  //  * - Clears only on a *true click* (movement within tolerance).
  //  * - Ignores clicks on interactive controls and on condition views.
  //  * - Left mouse button only.
  //  */
  // private _bindBackgroundDeselect(): void {
  //   const root = this._advancedSearchBuilderEl;
  //   const CLICK_TOLERANCE = 3; // px
  //   let downX = 0,
  //     downY = 0,
  //     isPointerDown = false;

  //   const isInteractive = (el: Element | null): boolean => {
  //     return !!(
  //       el &&
  //       el.closest(
  //         'a,button,input,select,textarea,[contenteditable="true"],.command'
  //       )
  //     );
  //   };

  //   const isConditionNode = (el: Element | null): boolean => {
  //     // 例: 条件要素のクラスをプロジェクトに合わせて調整
  //     return !!(
  //       el &&
  //       el.closest(
  //         '.advanced-search-condition-group-view, .advanced-search-condition-item-view'
  //       )
  //     );
  //   };

  //   root.addEventListener('pointerdown', (e) => {
  //     const pe = e as PointerEvent;
  //     if (pe.button !== 0) return; // left only
  //     isPointerDown = true;
  //     downX = pe.clientX;
  //     downY = pe.clientY;
  //   });

  //   root.addEventListener('pointerup', (e) => {
  //     if (!isPointerDown) return;
  //     isPointerDown = false;

  //     const pe = e as PointerEvent;
  //     // Ignore drag-like movement
  //     const moved = Math.hypot(pe.clientX - downX, pe.clientY - downY);
  //     if (moved > CLICK_TOLERANCE) return;

  //     const target = e.target as Element | null;

  //     // Do not clear when clicking controls or condition nodes
  //     if (isInteractive(target) || isConditionNode(target)) return;

  //     // Clear only for genuine background clicks inside root
  //     if (target && root.contains(target)) {
  //       e.stopPropagation(); // usually enough; prefer not to use stopImmediatePropagation()
  //       this._selection.deselectAllConditions();
  //     }
  //   });
  // }

  // accessor

  get elm(): HTMLElement {
    return this._advancedSearchBuilderEl;
  }

  get container(): HTMLElement {
    return this._container;
  }

  get selection(): AdvancedSearchSelection {
    return this._selection;
  }
}
