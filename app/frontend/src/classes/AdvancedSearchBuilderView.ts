import { setAdvancedSearchCondition } from '../store/searchManager';
import { ConditionGroupView } from './Condition/ConditionGroupView';
import type ConditionItemView from './Condition/ConditionItemView';
import { AdvancedSearchToolbar } from './AdvancedSearchToolbar';
import AdvancedSearchSelection from './AdvancedSearchSelection';
import { CONDITION_ITEM_TYPE } from '../definition.js';

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

    this._selection = new AdvancedSearchSelection(this._rootGroup.elm, this);
  }

  selectedConditionViews(conditionViews: any[]): void {
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

    this._advancedSearchBuilderEl.dataset.canDelete = String(
      conditionViews.length > 0
    );
    this._advancedSearchBuilderEl.dataset.canGroup = String(
      conditionViews.length > 1
    );
    const canUngroup = conditionViews.some((view) => view.canUngroup);
    this._advancedSearchBuilderEl.dataset.canUngroup = String(canUngroup);
    const canCopy = conditionViews.some((view) => view.canCopy);
    this._advancedSearchBuilderEl.dataset.canCopy = String(canCopy);
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
    const conditionViews: (ConditionGroupView | ConditionItemView)[] =
      this._selection.getSelectingConditionViews();
    if (conditionViews.length === 0) {
      throw new Error('No condition views selected to group.');
    }

    const parentGroupView = conditionViews[0].parentView;
    if (!parentGroupView) {
      throw new Error(
        'Parent group view not found for the selected condition views.'
      );
    }

    // Determine the insertion position and reference element
    const childViewsOfParentGroup: (ConditionGroupView | ConditionItemView)[] =
      parentGroupView.childViews;

    const { insertionPointEl } = conditionViews.reduce(
      (acc, view) => {
        const index = childViewsOfParentGroup.indexOf(view);
        // Identify the view that is positioned at the very front
        if (index < acc.position) {
          acc.position = index;
          acc.insertionPointEl = view.elm;
        }
        return acc;
      },
      { position: Infinity, insertionPointEl: null as HTMLElement | null }
    );

    // Add new group
    const conditionGroupView = parentGroupView.addNewConditionGroup(
      conditionViews,
      insertionPointEl
    );

    // Select the new group and update the condition state
    this._selection.selectConditionView(conditionGroupView, true);
    this.changeCondition();
  }

  ungroup() {
    const conditionViews = this._selection.getSelectingConditionViews();
    // deselect selecting group
    conditionViews.forEach((conditionView) => {
      this._selection.deselectConditionView(conditionView);
    });
    // ungroup
    conditionViews[0].ungroup();
    this.changeCondition();
  }

  /**
   *
   * @param {Array<ConditionView>} views
   */
  deleteCondition(views?: any[]): void {
    views = views ?? this._selection.getSelectingConditionViews();
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
    const selectingConditionViews =
      this._selection.getSelectingConditionViews();
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
