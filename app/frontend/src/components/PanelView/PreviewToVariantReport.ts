import PanelView from './PanelView';
import { storeManager } from '../../store/StoreManager';
import { getVariantReportPathWithinLength } from '../../utils/variantPath';

const DEFAULT_LINK_LABEL = 'Detailed variant report page';
const LONG_LOCUS_DISABLED_LABEL =
  'Detailed variant report page is unavailable because this locus URL is too long';

/**
 * 選択バリアントのバリアント詳細レポートページへのリンクを表示するパネル。
 * パネル全体が <a> 要素のため、バリアント選択時は href をセットしてパネル全体をリンク化する。
 * 未選択時や長すぎるlocusでは href を除去して .-disable でグレーアウトする。
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
   * TogoVar ID (tgvid) が無いバリアントも variant page へ遷移できるよう、
   * その場合は chromosome-position-reference-alternate 形式のURLへリンクする。
   */
  private _update(): void {
    const selectedRow = storeManager.getData('selectedRow');
    const record =
      selectedRow !== undefined ? storeManager.getSelectedRecord() : null;

    if (!record) {
      this.disableLink(DEFAULT_LINK_LABEL);
      return;
    }

    const reportPath = getVariantReportPathWithinLength(record);

    if (!reportPath) {
      this.disableLink(LONG_LOCUS_DISABLED_LABEL);
      return;
    }

    (this.elm as HTMLAnchorElement).href = reportPath;
    this.elm.setAttribute('aria-disabled', 'false');
    this.elm.setAttribute('title', DEFAULT_LINK_LABEL);
    this.elm.classList.remove('-disable');
  }

  /**
   * 無効理由ごとに支援技術とツールチップへ同じ状態を渡すため、href除去処理を集約する。
   */
  private disableLink(label: string): void {
    this.elm.removeAttribute('href');
    this.elm.setAttribute('aria-disabled', 'true');
    this.elm.setAttribute('title', label);
    this.elm.classList.add('-disable');
  }
}
