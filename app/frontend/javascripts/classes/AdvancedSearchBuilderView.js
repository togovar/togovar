import StoreManager from './StoreManager.js';
import ConditionGroupView from './ConditionGroupView.js';
import AdvancedSearchToolbar from './AdvancedSearchToolbar.js';
import AdvancedSearchSelection from './AdvancedSearchSelection.js';
// import {ADVANCED_CONDITIONS} from '../global.js';
// import {API_URL} from "../global.js";
import {CONDITION_ITEM_TYPE} from '../definition.js';

export default class AdvancedSearchBuilderView {

  constructor(elm) {

    this._elm = elm;
    this._container = elm.querySelector(':scope > .inner');
    this._rootGroup = new ConditionGroupView(this, this, 'and', [], null, true);

    // toolbar
    this._toolbar = new AdvancedSearchToolbar(this, this._rootGroup.maketToolbar());

    // events
    StoreManager.bind('advancedSearchConditions', this);
    this._defineEvents();

    // select conditions
    this._selection = new AdvancedSearchSelection(this._rootGroup.elm, this);
  }


  // public methods

  advancedSearchConditions(values) {
    console.log(values)
  }

  /**
   * 
   * @param {Array} conditionViews
   */
  selectedConditionViews(conditionViews) {
    console.log(conditionViews)

    // change status
    // can delete
    this._elm.dataset.canDelete = conditionViews.length > 0;
    // can group
    this._elm.dataset.canGroup = conditionViews.length > 1;
    // can ungroup
    let canUngroup = false;
    if (conditionViews.length === 1) canUngroup = conditionViews[0].type === CONDITION_ITEM_TYPE.group;
    this._elm.dataset.canUngroup = canUngroup;
  }

  // deselectedConditions(conditions) {
  //   console.log(conditions)
  // }

  // addConditions(conditions) {

  // }

  // removeConditions(conditions) {

  // }

  changeCondition() {
    const query = this._rootGroup.query;
    console.log(query)
    this._toolbar.canSearch(Object.keys(query).length > 0);
  }

  group() {
    const conditionViews = this._selection.getSelectingConditionViews();
    const parentGroupView = conditionViews[0].parentView;
    // insert position
    const siblingViews = parentGroupView.childViews;
    let position = Infinity, referenceElm = null;
    conditionViews.forEach(view => {
      const index = siblingViews.indexOf(view);
      if (index < position) {
        position = index;
        referenceElm = view.elm;
      }
    });
    // add new gropu
    const conditionGroupView = parentGroupView.addNewConditionGroup(conditionViews, referenceElm);
    this._selection.selectConditionViews([conditionGroupView], true);
    this.changeCondition();
  }

  ungroup() {
    const conditionViews = this._selection.getSelectingConditionViews();
    // deselect selecting group
    this._selection.deselectConditionViews(conditionViews);
    // ungroup
    conditionViews[0].ungroup();
    this.changeCondition();
  }

  copy() {
    console.log('_copy')
    this.changeCondition();
  }

  edit() {
    console.log('_edit')
    this.changeCondition();
  }

  delete() {
    console.log('_delete')
    const conditionViews = this._selection.getSelectingConditionViews();
    for (const view of conditionViews) {
      view.remove();
    }
    this._selection.deselectConditionViews(conditionViews);
    this.changeCondition();
  }

  search() {
    const query = this._rootGroup.query;
    StoreManager.setAd__vancedSearchCondition(query);
  }

  // add search condition to the currently selected layer
  addCondition(conditionType) {
    console.log(conditionType)

    // get selecting condition
    const selectingConditionViews = this._selection.getSelectingConditionViews();
    const selectingConditionView = selectingConditionViews.length > 0 ? selectingConditionViews[0] : this._rootGroup;
    
    // release exist conditions
    this._selection.deselectAllConditions();

    // add
    let newConditionView;
    switch(selectingConditionView.type) {
      case CONDITION_ITEM_TYPE.condition:
        console.log('TODO: ')
        // TODO: コンディションを選択していた場合に、その後ろに新規条件を追加
        break;
      case CONDITION_ITEM_TYPE.group:
        newConditionView = selectingConditionView.addNewConditionItem(conditionType);
        break;
    }
  }


  // private methods

  _defineEvents() {
    let downX, downY;
    this._elm.addEventListener('mousedown', e => {
      [downX, downY] = [e.x, e.y];
    });
    this._elm.addEventListener('click', e => {
      if (Math.abs(downX - e.x) > 2 || Math.abs(downY - e.y) > 2) return;
      e.stopImmediatePropagation();
      this._selection.deselectAllConditions();
    });

  }

  // accessor

  get elm() {
    return this._elm;
  }

  get container() {
    return this._container;
  }

  get selection() {
    return this._selection;
  }

}