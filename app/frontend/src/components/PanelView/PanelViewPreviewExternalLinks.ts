import PanelView from './PanelView';
import { storeManager } from '../../store/StoreManager';
import type { ExternalLinkItem } from '../../types';

/** テーブル行1件分のタイトルとリンク HTML をまとめた型 */
type LinkListEntry = {
  title: string;
  content: string;
};

/**
 * 選択バリアントの外部リンク一覧をプレビュー表示するパネル。
 * dbSNP / MGeND / ClinVar / ToMMo / gnomAD の各データベースへのリンクを表示する。
 */
export default class PanelViewPreviewExternalLinks extends PanelView {
  /** innerHTML で表示を更新する対象の dl 要素 */
  private readonly _dl: Element;

  /**
   * kind を 'preview-external-links' にする。
   * 旧 JS では 'dataset' を使っており、PanelViewCheckList の 'dataset' と LocalStorage キーが
   * 衝突していたため修正している（LocalStorage キーが変わることに注意）。
   */
  constructor(elm: Element) {
    super(elm, 'preview-external-links');
    storeManager.subscribe('selectedRow', () => this.selectedRow());
    storeManager.subscribe('offset', () => this.offset());
    this._dl = this.elm.querySelector<Element>('.content > .property-list')!;
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
   * 選択中バリアントの外部リンクをデータベース順に収集し、テーブル行として一括描画する。
   * 選択行が未定義または外部リンクが空のときは '-notfound' クラスで非表示にする。
   */
  private _update(): void {
    this.elm.classList.add('-notfound');
    this._dl.innerHTML = '';

    if (storeManager.getData('selectedRow') === undefined) return;

    const record = storeManager.getSelectedRecord();
    if (!record) return;

    // API移行中にexternal_link/external_linksが混在しても、プレビュー表示を止めない。
    const external_links = record.external_links ?? record.external_link;
    if (!external_links) return;
    const list: LinkListEntry[] = [
      ...(external_links.dbsnp?.map((item) =>
        this._createLinkEntry('refSNP', item.title, item.xref)
      ) ?? []),
      ...(external_links.tommo?.map((item) =>
        this._createLinkEntry('ToMMo', item.title, item.xref)
      ) ?? []),
      ...(external_links.jogo?.map((item) =>
        this._createLinkEntry('JoGo', item.title, item.xref)
      ) ?? []),
      ...(external_links.gnomad?.map((item) =>
        this._createLinkEntry('gnomAD', item.title, item.xref)
      ) ?? []),
      ...(external_links.gnomad_sv?.map((item) =>
        this._createLinkEntry('gnomAD SV', item.title, item.xref)
      ) ?? []),

      ...(external_links.mgend?.map((item) =>
        this._createLinkEntry('MGeND', item.title, item.xref)
      ) ?? []),
      ...(external_links.clinvar?.map((item) =>
        this._createLinkEntry('ClinVar', item.title, item.xref)
      ) ?? []),
      ...(external_links.sscv_db?.map((item) =>
        this._createLinkEntry('SSCV DB', item.title, item.xref)
      ) ?? []),
    ];

    if (list.length === 0) return;

    this._dl.innerHTML = list
      .map(
        (entry) => `<div><dt>${entry.title}</dt><dd>${entry.content}</dd></div>`
      )
      .join('');
    this.elm.classList.remove('-notfound');
  }

  /**
   * データベース名・ラベル・URL から LinkListEntry を生成する。
   * リンク生成ロジックを _update から分離し、テスト・変更しやすい単位にする。
   */
  private _createLinkEntry(
    title: string,
    label: ExternalLinkItem['title'],
    url: ExternalLinkItem['xref']
  ): LinkListEntry {
    /** innerHTML を組み立てる前提のため、ラベル文字列を XSS にならない形へ最小限エスケープする。 */
    const escapeHtml = (value: string): string =>
      value.replace(
        /[&<>"']/g,
        (ch) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          })[ch] as string
      );
    const safeLabel = escapeHtml(String(label));
    let safeUrl = '';
    try {
      const parsed = new URL(String(url), window.location.href);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        safeUrl = parsed.toString();
      }
    } catch {
      // ignore invalid URLs
    }
    return {
      title,
      content: safeUrl
        ? `<ul><li><a href="${safeUrl}" class="hyper-text -external" target="_blank" rel="noopener noreferrer">${safeLabel}</a></li></ul>`
        : `<ul><li>${safeLabel}</li></ul>`,
    };
  }
}
