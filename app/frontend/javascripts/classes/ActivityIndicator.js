import StoreManager from "./StoreManager.js";

export default class ActivityIndicator {

  constructor(elm) {
    this.elm = elm;
    StoreManager.bind('appStatus', this);
  }

  appStatus(status) {
    switch (status) {
      case 'searching':
        this.elm.classList.remove('-hidden');
        break;
      default:
        this.elm.classList.add('-hidden');
        break;
    }
  }
}
