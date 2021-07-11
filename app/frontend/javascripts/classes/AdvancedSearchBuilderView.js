import StoreManager from './StoreManager.js';
import ConditionGroupView from './ConditionGroupView.js';
import AdvancedSearchToolbar from './AdvancedSearchToolbar.js';
import AdvancedSearchSelection from './AdvancedSearchSelection.js';
// import {ADVANCED_CONDITIONS} from '../global.js';
// import {API_URL} from "../global.js";
import {conditionItemType} from '../definition.js';

export default class AdvancedSearchBuilderView {

  constructor(elm) {

    this._elm = elm;
    this._container = elm.querySelector(':scope > .inner');
    this._rootGroup = new ConditionGroupView(this, this, 'and', [], true);

    // status
    this._elm.dataset.selectedMultipleConditions = false;

    // toolbar
    this._toolbar = new AdvancedSearchToolbar(this, this._rootGroup.maketToolbar());

    // events
    StoreManager.bind('advancedSearchConditions', this);

    // select conditions
    this._selection = new AdvancedSearchSelection(this._rootGroup.elm, this);
  }


  // public methods

  /**
   * 
   * @param {Array} conditionViews
   */
  selectedConditionViews(conditionViews) {
    console.log(conditionViews)
    // change status
    this._elm.dataset.selectedMultipleConditions = conditionViews.length > 1;
  }

  deselectedConditions(conditions) {
    console.log(conditions)
  }

  addConditions(conditions) {

  }

  removeConditions(conditions) {

  }

  changeCondition() {
    const query = this._rootGroup.query;
    console.log(query)
    this._toolbar.canSearch(Object.keys(query).length > 0);
  }

  group() {
    console.log('_group')
    const conditionViews = this._selection.getSelectingConditionViews();
    console.log(conditionViews[0])
    const parentView = conditionViews[0].parentView;
    const conditionGroupView = parentView.addGroup(conditionViews);
    this._selection.selectConditionViews([conditionGroupView], true);
    this.changeCondition();
  }

  ungroup() {
    console.log('_ungroup')
  }

  copy() {
    console.log('_copy')
  }

  edit() {
    console.log('_edit')
  }

  delete() {
    console.log('_delete')
  }

  search() {
    const query = this._rootGroup.query;
    StoreManager.setAd__vancedSearchCondition(query);
  }

  // add search condition to the currently selected layer
  addCondition(conditionType) {

    // get selecting condition
    const selectingConditionViews = this._selection.getSelectingConditionViews();
    const selectingConditionView = selectingConditionViews.length > 0 ? selectingConditionViews[0] : this._rootGroup;
    
    // release exist conditions
    this._selection.deselectAllConditions();

    // add
    let newConditionView;
    switch(selectingConditionView.type) {
      case conditionItemType.condition:
        console.log('TODO: ')
        break;
      case conditionItemType.group:
        newConditionView = selectingConditionView.addCondition(conditionType);
        break;
    }
  }


  // private methods


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