import StoreManager from '../store/StoreManager';

export function keyDownEvent(storeName) {
  switch (storeName) {
    case 'showModal':
      if (!StoreManager.getData('showSuggest')) {
        return true;
      }
      return false;

    case 'selectedRow':
      if (!StoreManager.getData('showModal')) {
        return true;
      }
      return false;

    default:
      break;
  }
}
