// import {ADVANCED_CONDITIONS} from '../global.js';

export default class ConditionItemView {

  /**
   * 
   * @param {AdvancedSearchBuilderView} builder 
   * @param {ConditionItemView | ConditionGroupView} parentView 
   */
  constructor(builder, parentView) {
    console.log(builder, parentView)

    this._builder = builder;
    this._parentView = parentView;

    // make HTML
    this._elm = document.createElement('div');
    this._elm.classList.add('advanced-search-condition-view');
    this._elm.delegate = this;
    parentView.container.insertAdjacentElement('beforeend', this._elm);

    // event
    this._elm.addEventListener('click', () => {
      console.log('click', this)
      
    });
  }


  // public methods

  select() {
    this._elm.classList.add('-selected');
  }

  deselect() {
    this._elm.classList.remove('-selected');
  }

  remove() {
    console.log(this)
    this._parent.removeCondition(this);
  }


  // accessor

  /**
   * @return {HTMLElement}
   */
  get elm() {
    return this._elm;
  }

  /**
   * @return {ConditionItemView | ConditionGroupView}
   */
  get parentView() {
    return this._parentView;
  }

}