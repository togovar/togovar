import { storeManager } from '../store/StoreManager';

export default class ActivityIndicator {
  constructor(elm) {
    this.elm = elm;
    storeManager.bind('appStatus', this);
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
