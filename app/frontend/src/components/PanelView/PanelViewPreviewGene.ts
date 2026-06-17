import PanelView from './PanelView';
import { storeManager } from '../../store/StoreManager';

/**
 * 選択バリアントに関連する遺伝子シンボルをプレビュー表示するパネル。
 * Symbol（公式シンボル）と Alias（別名）を並べて表示する。
 */
export default class PanelViewPreviewGene extends PanelView {
  /** innerHTML で表示を更新する対象のテーブル要素 */
  private readonly _table: Element;

  /**
   * kind を 'preview-gene' にする。
   * 旧 JS では 'dataset' を使っており、PanelViewCheckList の 'dataset' と LocalStorage キーが
   * 衝突していたため修正している（LocalStorage キーが変わることに注意）。
   */
  constructor(elm: Element) {
    super(elm, 'preview-gene');
    storeManager.subscribe('selectedRow', () => this.selectedRow());
    storeManager.subscribe('offset', () => this.offset());
    this._table = this.elm.querySelector<Element>(
      '.content > .right-headline'
    )!;
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
   * 選択中バリアントの遺伝子シンボルを一覧表示する。
   * 選択行が未定義またはシンボルが空のときは '-notfound' クラスで非表示にする。
   */
  private _update(): void {
    this.elm.classList.add('-notfound');

    if (storeManager.getData('selectedRow') === undefined) {
      this._table.innerHTML = '';
      return;
    }

    const record = storeManager.getSelectedRecord();
    if (!record || !record.symbols || record.symbols.length === 0) {
      this._table.innerHTML = '';
      return;
    }

    /** innerHTML へ挿入する値の XSS を避けるため、最低限の文字だけ HTML エスケープする。 */
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
    this._table.innerHTML = record.symbols
      .map((symbol) => {
        const name = escapeHtml(symbol.name);
        const aliases =
          symbol.synonyms.length === 0
            ? ''
            : `<tr><th>Alias</th><td>${symbol.synonyms.map(escapeHtml).join(', ')}</td></tr>`;
        return (
          `<tbody>` +
          `<tr><th>Symbol</th><td>` +
          `<a href="/gene/${encodeURIComponent(String(symbol.id))}" target="_blank" rel="noopener noreferrer" class="hyper-text -internal">${name}</a>` +
          `</td></tr>` +
          aliases +
          `</tbody>`
        );
      })
      .join('');

    this.elm.classList.remove('-notfound');
  }
}
