import PanelView from './PanelView';
import { storeManager } from '../../store/StoreManager';

const REPORT_LABEL = 'Detailed variant report page';

/**
 * 選択バリアントのバリアント詳細レポートページへのリンクを表示するパネル。
 * バリアントが選択されていればリンク（a タグ）、未選択なら非活性ラベル（span）を表示する。
 */
export default class PreviewToVariantReport extends PanelView {
  /** replaceChildren で内容を差し替える対象のタイトル要素 */
  private readonly _title: Element;

  /**
   * kind を 'preview-to-variant-report' にする。
   * 旧 JS では 'dataset' を使っており、PanelViewCheckList の 'dataset' と LocalStorage キーが
   * 衝突していたため修正している（LocalStorage キーが変わることに注意）。
   */
  constructor(elm: Element) {
    super(elm, 'preview-to-variant-report');
    storeManager.bind('selectedRow', this);
    storeManager.bind('offset', this);
    this._title = this.elm.querySelector<Element>('.title')!;
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
   * 選択中バリアントの ID を使ってリンクを生成し、タイトル要素を差し替える。
   * バリアント未選択時は span に差し替え、-disable クラスでパネルを非活性表示にする。
   */
  private _update(): void {
    const selectedRow = storeManager.getData('selectedRow');
    const record =
      selectedRow !== undefined ? storeManager.getSelectedRecord() : null;

    if (record && record.id) {
      const link = document.createElement('a');
      link.classList.add('hyper-text', '-internal');
      link.href = `/variant/${encodeURIComponent(record.id)}`;
      link.textContent = REPORT_LABEL;
      this.elm.classList.remove('-disable');
      this._title.replaceChildren(link);
      return;
    }

    const label = document.createElement('span');
    label.classList.add('hyper-text', '-internal');
    label.textContent = REPORT_LABEL;
    this.elm.classList.add('-disable');
    this._title.replaceChildren(label);
  }
}
