// AdvancedSearchBuilderView.ts
import { setAdvancedSearchCondition } from '../store/searchManager';
import { ConditionGroupView } from './Condition/ConditionGroupView';
import {
  type ConditionView,
  type GroupView,
  isGroupView,
} from './Condition/ConditionView';
import { AdvancedSearchToolbar } from './AdvancedSearchToolbar';
import { AdvancedSearchSelection } from './AdvancedSearchSelection';
import { CONDITION_NODE_KIND } from '../definition';

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
      this,
      this._container,
      'and',
      [],
      null,
      true
    );

    this._toolbar = new AdvancedSearchToolbar(
      this,
      this._rootGroup.makeToolbar()
    );
    this._selection = new AdvancedSearchSelection(this);
  }

  /** Back-compat for callers still invoking selectedConditionViews(...) */
  // selectedConditionViews(selection: ConditionView[]): void {
  //   this.onSelectionChange(selection);
  // }

  // /** Primary entry from selection manager */
  // onSelectionChange(selection: ConditionView[]): void {
  //   const caps = this._computeSelectionCapabilities(selection);
  //   this._applyCapabilitiesToDataset(caps);
  // }

  selectedConditionViews(selection: ConditionView[]): void {
    this.onSelectionChange(selection);
  }

  onSelectionChange(selection: ConditionView[]): void {
    const caps = this._computeSelectionCapabilities(selection);

    this._applyCapabilitiesToDataset(caps);
  }

  private _computeSelectionCapabilities(
    selection: ConditionView[]
  ): SelectionCapabilities {
    const n = selection.length;

    const canUngroup =
      n === 1 &&
      (selection[0].canUngroup === true ||
        selection[0].conditionNodeKind === CONDITION_NODE_KIND.group);

    let canGroup = false;
    if (n > 1) {
      const parent = selection[0].parentGroup; // GroupView | null
      const sameParent =
        !!parent && selection.every((v) => v.parentGroup === parent);
      if (sameParent && parent) {
        const totalChildren = parent.childViews.length;
        const notAllSelected = n < totalChildren;
        canGroup = notAllSelected;
      }
    }

    const canDelete = n > 0;

    const canCopy =
      n === 1 &&
      (selection[0].canCopy === true ||
        selection[0].conditionNodeKind === CONDITION_NODE_KIND.condition);

    return { canDelete, canGroup, canUngroup, canCopy };
  }

  private _applyCapabilitiesToDataset(caps: SelectionCapabilities): void {
    this._advancedSearchBuilderEl.dataset.canDelete = String(caps.canDelete);
    this._advancedSearchBuilderEl.dataset.canGroup = String(caps.canGroup);
    this._advancedSearchBuilderEl.dataset.canUngroup = String(caps.canUngroup);
    this._advancedSearchBuilderEl.dataset.canCopy = String(caps.canCopy);
  }

  changeCondition(): void {
    this.search();
  }

  /** Group selected views into a new group under their common parent. */
  group(): void {
    const selected: ConditionView[] =
      this._selection.getSelectedConditionViews();
    if (selected.length === 0)
      throw new Error('No condition views selected to group.');

    const parent = selected[0].parentGroup; // GroupView | null
    if (!parent)
      throw new Error(
        'Parent group view not found for the selected condition views.'
      );

    const siblings: ConditionView[] = parent.childViews;
    let minIndex = Number.POSITIVE_INFINITY;
    let insertionEl: HTMLElement | null = null;

    for (const v of selected) {
      const idx = siblings.indexOf(v);
      if (idx !== -1 && idx < minIndex) {
        minIndex = idx;
        insertionEl = v.rootEl;
      }
    }

    const newGroup = parent.addNewConditionGroup(selected, insertionEl);
    this._selection.selectConditionView(newGroup, true);
    this.changeCondition();
  }

  /** Ungroup the (single) selected group. */
  ungroup(): void {
    const selected = this._selection.getSelectedConditionViews();
    if (selected.length === 0) return;

    // deselect current selection
    selected.forEach((v) => this._selection.deselectConditionView(v));

    const first = selected[0];
    if (isGroupView(first)) {
      first.ungroup(); // GroupView の API として宣言されていることが前提
      this.changeCondition();
    }
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

  /** Delete selected (or provided) views. */
  deleteCondition(views?: ConditionView[]): void {
    const list = views ?? this._selection.getSelectedConditionViews();
    for (const v of list) {
      v.remove();
      this._selection.deselectConditionView(v);
    }
    this.changeCondition();
  }

  search(): void {
    const query = this._rootGroup.query;
    setAdvancedSearchCondition(query);
  }

  /** Add a condition under the selected group (or root if none selected). */
  addCondition(conditionType: string, options: any): void {
    const selected = this._selection.getSelectedConditionViews();
    const target: ConditionView | GroupView =
      selected.length > 0 ? selected[0] : this._rootGroup;

    // clear current selection
    this._selection.deselectAllConditions();

    switch (target.conditionNodeKind) {
      case CONDITION_NODE_KIND.condition:
        // TODO: insert after the selected condition
        break;
      case CONDITION_NODE_KIND.group:
        if (isGroupView(target)) {
          target.addNewConditionItem(conditionType, options);
        }
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

  // accessors
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
