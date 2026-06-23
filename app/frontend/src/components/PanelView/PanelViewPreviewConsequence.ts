import PanelView from './PanelView';
import { storeManager } from '../../store/StoreManager';
import { getSimpleSearchConditionMaster } from '../../store/searchManager';
import type { MasterConditionItem } from '../../types';

/**
 * 選択バリアントの Consequence 一覧をプレビュー表示するパネル。
 * 各 Transcript の consequence 配列を集約し、マスター定義のラベルと説明を表示する。
 */
export default class PanelViewPreviewConsequence extends PanelView {
  /** innerHTML で表示を更新する対象のコンテンツ領域 */
  private readonly _content: Element;

  /**
   * kind を 'preview-consequence' にする。
   * 旧 JS では 'frenquecies' というコピペミスがあり、PanelViewPreviewAlternateAlleleFrequencies と
   * LocalStorage キーが衝突していたため修正している（LocalStorage キーが変わることに注意）。
   * 'consequence' は PanelViewFilterConsequence がすでに使用しているため区別する。
   */
  constructor(elm: Element) {
    super(elm, 'preview-consequence');
    storeManager.subscribe('selectedRow', () => this.selectedRow());
    storeManager.subscribe('offset', () => this.offset());
    this._content = this.elm.querySelector('.content')!;
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
   * 選択中バリアントの全 Transcript から consequence を収集し、ラベルと説明を一覧表示する。
   * 選択行が未定義・Transcript が空の場合は '-notfound' クラスを付与して非表示にする。
   */
  private _update(): void {
    this.elm.classList.add('-notfound');
    this._content.innerHTML = '';

    if (storeManager.getData('selectedRow') === undefined) return;

    const record = storeManager.getSelectedRecord();
    const transcripts = record?.transcripts ?? [];
    if (transcripts.length === 0) return;

    const master = getSimpleSearchConditionMaster('consequence');
    if (!master || !master.items) return;
    const masterItems: MasterConditionItem[] = master.items;

    // 全 Transcript の consequence 配列を展開して重複を除去する
    const accessions = Array.from(
      new Set(transcripts.flatMap((t) => t.consequence ?? []))
    );

    // アクセッションに対応するマスターアイテムを取得し、未定義のものを除去する
    const consequences = accessions.flatMap((accession) => {
      const item = masterItems.find((c) => c.id === accession);
      return item !== undefined ? [item] : [];
    });

    if (consequences.length === 0) return;

    /** innerHTML へ入れるラベル/説明が外部データ由来でも安全になるよう、最小限の HTML エスケープを行う。 */
    const escapeHtml = (value: string): string =>
      value.replace(
        /[&<>"']/g,
        (ch) =>
          ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string)
      );

    this._content.innerHTML = consequences
      .map((item) => {
        const label = escapeHtml(String(item.label));
        const description = escapeHtml(String(item.description ?? ''));
        return `<dl class="above-headline"><dt>${label}</dt><dd>${description}</dd></dl>`;
      })
      .join('');

    this.elm.classList.remove('-notfound');
  }
}
