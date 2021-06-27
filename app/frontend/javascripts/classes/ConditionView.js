import {ADVANCED_CONDITIONS} from '../global.js';

export default class ConditionItemView {

  /**
   * 
   * @param {AdvancedSearchBuilderView} builder 
   * @param {*} parent 
   * @param {HTMLElement} parentNode 
   */
  constructor(builder, parent, parentNode) {
    console.log(builder, parent, parentNode)

    this._builder = builder;
    this._parent = parent;

    // make HTML
    this._elm = document.createElement('div');
    this._elm.delegate = this;
    this._elm.classList.add('-selected');
    parentNode.insertAdjacentElement('beforeend', this._elm);

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

  get elm() {
    return this._elm;
  }

}