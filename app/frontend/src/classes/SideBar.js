import { storeManager } from '../store/StoreManager';
import { resetSimpleSearchConditions } from '../store/searchManager';

export default class SideBar {
  constructor(elm) {
    this._elm = elm;
    this._body = document.getElementsByTagName('body')[0];
    // イベント
    storeManager.bind('selectedRow', this);
    // リセットボタン
    this._setupResetButton();
  }

  _setupResetButton() {
    const resetButton = this._elm.querySelector(
      '#Filters > .title > .button-view'
    );
    resetButton.addEventListener('click', () => {
      resetSimpleSearchConditions();
    });
  }

  // bindings ///////////////////////////

  selectedRow(index) {
    if (index === undefined) {
      // show filters
      this._body.classList.remove('-rowselected');
    } else {
      // show previews
      this._body.classList.add('-rowselected');
    }
  }
}
