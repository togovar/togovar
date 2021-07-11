// import {ADVANCED_CONDITIONS} from '../global.js';

export default class ConditionItemView {

  /**
   * 
   * @param {AdvancedSearchBuilderView} builder 
   * @param {ConditionItemView | ConditionGroupView} parentView 
   */
  constructor(type, builder, parentView) {
    console.log(type, builder, parentView)

    this._builder = builder;
    this._parentView = parentView;

    // make HTML
    this._elm = document.createElement('div');
    this._elm.classList.add('advanced-search-condition-view');
    this._elm.delegate = this;
    parentView.container.append(this._elm);

    // event
    // let eventTarget;
    // switch (type) {
    //   case 'group':
    //   eventTarget = this._elm;
    //   break;
    //   case 'item':
    //   console.log(this._elm)
    //   console.log(this._elm.querySelector(':scope'))
    //   console.log(this._elm.querySelector(':scope > .body'))
    //   console.log(this._elm.querySelector(':scope > .body > .summary'))
    //   eventTarget = this._elm.querySelector(':scope > .body > .summary');
    //   break;
    // }
    // console.log(eventTarget)
    // eventTarget.addEventListener('click', e => {
    //   e.stopPropagation();
    //   console.log('click', this, e)
      
    // });
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
   * @return {Boolean}
   */
  get isSelecting() {
    return this._elm.classList.contains('-selected');
  }

  /**
   * @return {ConditionItemView | ConditionGroupView}
   */
  get parentView() {
    return this._parentView;
  }

}