import PanelView from './PanelView';
import { storeManager } from '../../store/StoreManager';

/**
 * 選択バリアントのバリアント詳細レポートページへのリンクを表示するパネル。
 * パネル全体が <a> 要素のため、バリアント選択時は href をセットしてパネル全体をリンク化する。
 * 未選択時は href を除去して .-disable でグレーアウトする。
 */
export default class PreviewToVariantReport extends PanelView {
  constructor(elm: Element) {
    super(elm, 'preview-to-variant-report');
    storeManager.subscribe('selectedRow', () => this.selectedRow());
    storeManager.subscribe('offset', () => this.offset());
  }

  /**
   * 選択行が変わったときに storeManager から呼ばれるコールバック。
   * 表示更新は _update に委譲し、このメソッドはトリガーとしてのみ機能させる。
   */
  selectedRow(): void {
    this._update();
  }

  /**
   * ページオフセットが変わったときに storeManager から呼ばれるコールバック。
   * ページ送りで選択行のバリアントが変わるため、表示を更新する。
   */
  offset(): void {
    this._update();
  }

  /**
   * 選択中バリアントの ID を使って外側の <a> の href を更新する。
   * 子要素ではなくルート要素の href を切り替えることでパネル全体がリンクになる。
   */
  private _update(): void {
    const selectedRow = storeManager.getData('selectedRow');
    const record =
      selectedRow !== undefined ? storeManager.getSelectedRecord() : null;

    if (record && record.id) {
      (this.elm as HTMLAnchorElement).href =
        `/variant/${encodeURIComponent(record.id)}`;
      this.elm.classList.remove('-disable');
      return;
    }

    this.elm.removeAttribute('href');
    this.elm.classList.add('-disable');
  }
}
