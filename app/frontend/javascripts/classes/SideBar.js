import StoreManager from "./StoreManager.js";

export default class SideBar {

  constructor(elm) {
    this._elm = elm;
    // イベント
    StoreManager.bind('selectedRow', this);
    // スクロールバーを隠す
    const scrollBarWidth = this._elm.offsetWidth - this._elm.clientWidth;
    this._elm.style.width = `${this._elm.offsetWidth + scrollBarWidth}px`;
    this._elm.style.marginRight = `-${scrollBarWidth}px`;
    // リセットボタン
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
      // フィルターを表示
      this._elm.classList.remove('-rowselected');
    } else {
      // プレビューを表示
      this._elm.classList.add('-rowselected');
    }
  }

}
