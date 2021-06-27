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
    const inner = elm.querySelector(':scope > .inner');
    this._rootGroup = new ConditionGroupView(this, undefined, inner, 'and', [], true);

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

  selectConditions(conditions, deselectExistingConditions = false) {
    console.log(conditions)
    // change status
    this._elm.dataset.selectedMultipleConditions = conditions.length > 1;
    // deselect
    if (deselectExistingConditions) this._selection.deselectAllConditions();
    // select
    this._selection.addConditions(conditions);
  }

  deselectConditions(conditions) {
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
    console.log( this._rootGroup.elm.childNodes )
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
  addCondition(condition) {
    console.log(condition)

    // get selecting condition
    const selectingConditions = this._selection.getSelectingConditions();
    const selectingCondition = selectingConditions.length > 0 ? selectingConditions[0] : this._rootGroup;
    console.log(selectingCondition)
    
    // release exist conditions
    this._selection.deselectAllConditions();

    // add
    let newConditionView;
    switch(selectingCondition.type) {
      case conditionItemType.condition:
        console.log('TODO: ')
        break;
      case conditionItemType.group:
        newConditionView = selectingCondition.addCondition(condition);
        break;
    }
  }


  // private methods


}