import StoreManager from '../classes/StoreManager.js';

export function keyDownEvent(storeName) {
  let showModal = StoreManager.getData('showModal');
  let showSuggest = StoreManager.getData('showSuggest');

  switch (storeName) {
    case 'showModal':
      if (showSuggest !== true) {
        return true;
      }
      return false;

    case 'selectedRow':
      if (showModal !== true) {
        return true;
      }
      return false;

    default:
      break;
  }
}