import { storeManager } from '../store/StoreManager';
import type { StoreState } from '../types/store';

export default class LoadingIndicator {
  private readonly elm: HTMLElement;

  /**
   * StoreManagerに自身をバインドし、appStatusの変化を受け取れるようにする。
   * バインドすることでLoadingIndicator#appStatus()がStoreの変更通知先になる。
   */
  constructor(elm: HTMLElement) {
    this.elm = elm;
    storeManager.bind('appStatus', this);
    this.appStatus(storeManager.getData('appStatus'));
  }

  /**
   * appStatusが'searching'のときだけローディング表示し、それ以外は隠す。
   * 将来のステータス追加に備えてswitchで受け、defaultで確実に非表示にする。
   */
  appStatus(status: StoreState['appStatus']): void {
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
