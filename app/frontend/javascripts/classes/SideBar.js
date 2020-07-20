import StoreManager from "./StoreManager.js";

export default class SideBar {

  constructor(elm) {
    this._elm = elm;
    StoreManager.bind('selectedRow', this);
    const scrollBarWidth = this._elm.offsetWidth - this._elm.clientWidth;
    this._elm.style.width = `${this._elm.offsetWidth + scrollBarWidth}px`;
    this._elm.style.marginRight = `-${scrollBarWidth}px`;
    this._setupResetButton();
  }

  _setupResetButton() {
    const resetButton = this._elm.querySelector('#Filters > .title > .button-view');
    resetButton.addEventListener('click', () => {
      StoreManager.resetSearchConditions();
    });
  }

  // bindings ///////////////////////////

  selectedRow(index) {
    if (index === undefined) {
      this._elm.classList.remove('-rowselected');
    } else {
      this._elm.classList.add('-rowselected');
    }
  }
}
