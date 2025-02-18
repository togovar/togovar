import { storeManager } from '../store/StoreManager';

export function keyDownEvent(storeName) {
  switch (storeName) {
    case 'showModal':
      if (!storeManager.getData('showSuggest')) {
        return true;
      }
      return false;

    case 'selectedRow':
      if (!storeManager.getData('showModal')) {
        return true;
      }
      return false;

    default:
      break;
  }
}
