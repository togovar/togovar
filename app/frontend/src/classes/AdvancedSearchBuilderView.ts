import { setAdvancedSearchCondition } from '../store/searchManager';
import { ConditionGroupView } from './Condition/ConditionGroupView';
import { type ConditionView, isGroupView } from './Condition/ConditionView';
import { AdvancedSearchToolbar } from './AdvancedSearchToolbar';
import { AdvancedSearchSelection } from './AdvancedSearchSelection';
import { CONDITION_NODE_KIND, type ConditionTypeValue } from '../definition';
import { selectRequired } from '../utils/dom/select';

type Selection = ReadonlyArray<ConditionView>;

type SelectionCapabilities = Readonly<{
  canDelete: boolean;
  canGroup: boolean;
  canUngroup: boolean;
  canCopy: boolean;
}>;

/**
 * AdvancedSearchBuilderView
 * - Owns the root group and toolbar
 * - Mediates selection → capability flags → toolbar state
 * - Builds and submits the query on changes
 */
export class AdvancedSearchBuilderView {
  private _advancedSearchBuilderEl: HTMLElement;
  private _container: HTMLElement;
  private _rootGroup: ConditionGroupView;
  private _toolbar: AdvancedSearchToolbar;
  private _selection: AdvancedSearchSelection;

  constructor(advancedSearchBuilderEl: HTMLElement) {
    this._advancedSearchBuilderEl = advancedSearchBuilderEl;

    // Container that holds all condition/group views
    this._container = selectRequired(
      advancedSearchBuilderEl,
      ':scope > .inner'
    );

    // Root (AND) group
    this._rootGroup = new ConditionGroupView(
      this,
      this._container,
      'and',
      [],
      null,
      true
    );

    // Toolbar & selection manager
    this._toolbar = new AdvancedSearchToolbar(
      this,
      this._rootGroup.makeToolbar()
    );
    this._selection = new AdvancedSearchSelection(this);
  }

  // ─────────────────────────────────────────────────────────
  // Selection → capability flags
  // ─────────────────────────────────────────────────────────

  /** Back-compat: legacy callers still call selectedConditionViews(...) */
  selectedConditionViews(selection: ConditionView[]): void {
    this.onSelectionChange(selection);
  }

  /** Primary entry from selection manager. */
  onSelectionChange(selection: ConditionView[]): void {
    const caps = this._computeSelectionCapabilities(selection);
    this._applyCapabilitiesToDataset(caps);
  }

  /** Compute capability flags from current selection. */
  private _computeSelectionCapabilities(
    selection: Selection
  ): SelectionCapabilities {
    const n = selection.length;
    if (n === 0) {
      return {
        canDelete: false,
        canGroup: false,
        canUngroup: false,
        canCopy: false,
      };
    }

    const parents = new Set(
      selection.map((v) => v.parentGroup).filter(Boolean)
    );
    const single = n === 1;
    const first = selection[0];

    // canUngroup: a single selected group (or item that declares canUngroup)
    const canUngroup =
      single &&
      (first.canUngroup === true ||
        first.conditionNodeKind === CONDITION_NODE_KIND.group);

    // canGroup: 2+ items, same parent, and not all siblings selected
    const canGroup =
      n > 1 &&
      parents.size === 1 &&
      (() => {
        const parent = parents.values().next().value!;
        const total = parent.childViews.length;
        return n < total;
      })();

    // canDelete: any selection
    const canDelete = true;

    const canCopy =
      single &&
      (first.canCopy === true ||
        first.conditionNodeKind === CONDITION_NODE_KIND.condition);

    return { canDelete, canGroup, canUngroup, canCopy };
  }

  private _setFlag(
    name: 'canDelete' | 'canGroup' | 'canUngroup' | 'canCopy',
    v: boolean
  ) {
    this._advancedSearchBuilderEl.dataset[name] = String(v);
  }

  /** Reflect capability flags as data-* attributes for CSS/toolbar state. */
  private _applyCapabilitiesToDataset(caps: SelectionCapabilities): void {
    this._setFlag('canDelete', caps.canDelete);
    this._setFlag('canGroup', caps.canGroup);
    this._setFlag('canUngroup', caps.canUngroup);
    this._setFlag('canCopy', caps.canCopy);
  }

  // ─────────────────────────────────────────────────────────
  // Public actions
  // ─────────────────────────────────────────────────────────

  /** Notify that the condition set changed → re-run search. */
  changeCondition(): void {
    this._submitAdvancedSearchCondition();
  }

  /** Group selected views into a new subgroup under their common parent. */
  group(): void {
    const selected = this._selection.getSelectedConditionViews();
    if (selected.length === 0)
      throw new Error('No condition views selected to group.');

    const parents = new Set(selected.map((v) => v.parentGroup).filter(Boolean));
    if (parents.size !== 1) return; // 親がバラバラなら何もしない
    const parent = parents.values().next().value!;

    // Compute insertion position = the minimum index among selected
    const siblings = parent.childViews;
    let insertionEl: HTMLElement | null = null;
    let minIndex = Infinity;
    for (const v of selected) {
      const idx = siblings.indexOf(v);
      if (idx >= 0 && idx < minIndex) {
        minIndex = idx;
        insertionEl = v.rootEl;
      }
    }

    const newGroup = parent.addNewConditionGroup(selected, insertionEl);
    this._selection.selectConditionView(newGroup, true);
    this.changeCondition();
  }

  /** Ungroup the (single) selected group. No-op if selection is empty or not a group. */
  ungroup(): void {
    const selected = this._selection.getSelectedConditionViews();
    if (selected.length === 0) return;

    // Deselect current selection before modification
    selected.forEach((v) => this._selection.deselectConditionView(v));

    const first = selected[0];
    if (isGroupView(first)) {
      first.ungroup();
      this.changeCondition();
    }
  }

  // copyとeditは現在未実装だが、将来的に拡張の可能性あり
  // copy() {
  //   console.log('_copy')
  //   const selectingConditionViews = this._selection.getSelectingConditionViews();
  //   this.changeCondition();
  // }

  // edit() {
  //   console.log('_edit')
  //   this.changeCondition();
  // }

  /** Delete selected (or provided) views. */
  deleteCondition(views?: ConditionView[]): void {
    const list = views ?? this._selection.getSelectedConditionViews();
    if (list.length === 0) return;

    for (const v of list) {
      v.remove();
      this._selection.deselectConditionView(v);
    }
    this.changeCondition();
  }

  /** Rebuild query from the root group and submit to the store. */
  private _submitAdvancedSearchCondition(): void {
    const query = this._rootGroup.queryFragment;
    setAdvancedSearchCondition(query);
  }

  /**
   * Add a condition under the selected group (or root if none selected).
   * If a single condition is selected, we could insert "after" it; currently we
   * append to its parent group (kept as-is to avoid interface drift).
   */
  addCondition(conditionType: ConditionTypeValue): void {
    const selected = this._selection.getSelectedConditionViews();
    const target = selected.length > 0 ? selected[0] : this._rootGroup;

    this._selection.deselectAllConditions();

    if (target.conditionNodeKind === CONDITION_NODE_KIND.condition) {
      target.parentGroup?.addNewConditionItem(
        conditionType,
        target.rootEl.nextSibling // ← 直後に挿入
      );
    } else if (
      target.conditionNodeKind === CONDITION_NODE_KIND.group &&
      isGroupView(target)
    ) {
      target.addNewConditionItem(conditionType);
    }
  }

  // 以下のコメントは、範囲外を押すと選択が解除されるようにするためのコードだが、現在は動作していないので修正が必要
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

  // ─────────────────────────────────────────────────────────
  // Accessors
  // ─────────────────────────────────────────────────────────

  get container(): HTMLElement {
    return this._container;
  }
  get selection(): AdvancedSearchSelection {
    return this._selection;
  }

  destroy(options?: { clearDom?: boolean }): void {
    // ツールバー（AbortController 等）があるなら開放
    this._toolbar?.destroy({ clearDom: options?.clearDom });
    // ルートグループ以下の View も remove（内部で自前のリスナ/Observerを解放）
    this._rootGroup?.remove();
    // 参照を落として GC 促進
    // this._toolbar =
    //   this._rootGroup =
    //   this._selection =
    //   this._container =
    //   this._advancedSearchBuilderEl =
    //     null;
  }
}
