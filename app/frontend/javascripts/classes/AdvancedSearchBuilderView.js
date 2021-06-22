import StoreManager from './StoreManager.js';
import ConditionGroupView from './ConditionGroupView.js';
import AdvancedSearchToolbar from './AdvancedSearchToolbar.js';
import AdvancedSearchSelection from './AdvancedSearchSelection.js';
// import {ADVANCED_CONDITIONS} from '../global.js';
// import {API_URL} from "../global.js";

export default class AdvancedSearchBuilderView {

  constructor(elm) {

    this._elm = elm;
    console.log(elm)
    const inner = elm.querySelector(':scope > .inner');
    this._rootGroup = new ConditionGroupView(this, inner, 'and', [], true);
    this._selectingCondition = this._rootGroup;

    // status
    this._elm.dataset.selectedMultipleConditions = false;

    // toolbar
    this._toolbar = new AdvancedSearchToolbar(this, this._rootGroup.maketToolbar());

    // events
    StoreManager.bind('advancedSearchConditions', this);

    // select conditions
    new AdvancedSearchSelection(this._rootGroup.elm, this);
  }


  // public methods

  select(elements) {
    console.log(elements)
    this._elm.dataset.selectedMultipleConditions = elements.length > 1;
  }

  changeCondition() {
    const query = this._rootGroup.query;
    this._toolbar.canSearch(Object.keys(query).length > 0);
  }

  search() {
    const query = this._rootGroup.query;
    StoreManager.setAd__vancedSearchCondition(query);
  }


  // private methods

  _addCondition(condition) {
    console.log(condition)
    this._selectingCondition.addCondition(condition);
  }

  _group() {
    console.log('_group')
  }

  _ungroup() {
    console.log('_ungroup')
  }

  _copy() {
    console.log('_copy')
  }

  _edit() {
    console.log('_edit')
  }

  _delete() {
    console.log('_delete')
  }

}