import { storeManager } from '../store/StoreManager';
import type { StoreState } from '../types/storeState';

export default class LoadingIndicator {
  private readonly elm: HTMLElement;

  /**
   * appLoadingStatusの変化を受け取るためStoreに購読登録し、初期値を即時反映する。
   */
  constructor(elm: HTMLElement) {
    this.elm = elm;
    storeManager.subscribe('appLoadingStatus', (v) =>
      this._updateAppLoadingStatus(v)
    );
    this._updateAppLoadingStatus(storeManager.getData('appLoadingStatus'));
  }

  /**
   * 全体loadingはappLoadingStatusだけを見て、Results内の行loading用フラグと責務を分ける。
   * 将来のステータス追加に備えてswitchで受け、defaultで確実に非表示にする。
   */
  private _updateAppLoadingStatus(
    status: StoreState['appLoadingStatus']
  ): void {
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
