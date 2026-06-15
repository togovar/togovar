import { storeManager } from '../store/StoreManager';
import type { StoreState } from '../types/store';

export default class LoadingIndicator {
  private readonly elm: HTMLElement;

  /**
   * appStatusの変化を受け取るためStoreに購読登録し、初期値を即時反映する。
   */
  constructor(elm: HTMLElement) {
    this.elm = elm;
    storeManager.subscribe('appStatus', (v) => this.appStatus(v));
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
