import PanelView from './PanelView';
import { storeManager } from '../../store/StoreManager';
import { createEl } from '../../utils/dom/createEl';
import { selectRequired } from '../../utils/dom/select';
import type { GeneSymbol } from '../../types';

/**
 * APIやStoreに配列以外のgenesが入ってもプレビュー描画を止めないため、表示可能な配列だけを通す。
 */
function getGeneSymbols(value: unknown): GeneSymbol[] {
  if (!Array.isArray(value)) return [];

  return value.filter(isGeneSymbol);
}

/**
 * synonymsも外部データ由来のため、表示に使える文字列配列だけへ絞り込む。
 */
function getSynonyms(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is string => typeof item === 'string');
}

/**
 * innerHTMLへ挿入する遺伝子情報は外部データ由来のため、表示に必要なshapeだけを確認する。
 */
function isGeneSymbol(value: unknown): value is GeneSymbol {
  if (typeof value !== 'object' || value === null) return false;

  const symbol = value as Partial<GeneSymbol>;
  return typeof symbol.name === 'string' && symbol.id !== undefined;
}

/**
 * 選択バリアントに関連する遺伝子シンボルをプレビュー表示するパネル。
 * Symbol（公式シンボル）と Alias（別名）を並べて表示する。
 */
export default class PanelViewPreviewGene extends PanelView {
  /** DOM再構築の対象を限定し、パネル全体を触らずに表示だけ更新するため保持する。 */
  private readonly _dl: HTMLElement;

  /**
   * kind を 'preview-gene' にする。
   * 旧 JS では 'dataset' を使っており、PanelViewCheckList の 'dataset' と LocalStorage キーが
   * 衝突していたため修正している（LocalStorage キーが変わることに注意）。
   */
  constructor(elm: Element) {
    super(elm, 'preview-gene');
    storeManager.subscribe('selectedRow', () => this.selectedRow());
    storeManager.subscribe('offset', () => this.offset());
    this._dl = selectRequired<HTMLElement>(
      this.elm,
      '.content > .property-list',
      'PanelViewPreviewGene'
    );
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
      this._dl.replaceChildren();
      return;
    }

    const record = storeManager.getSelectedRecord();
    const geneSymbols = getGeneSymbols(record?.genes);
    if (geneSymbols.length === 0) {
      this._dl.replaceChildren();
      return;
    }

    this._dl.replaceChildren(
      ...geneSymbols.flatMap((symbol, index) =>
        this._createGeneRows(symbol, index)
      )
    );
    this.elm.classList.remove('-notfound');
  }

  /**
   * 遺伝子ごとの表示行をDOMとして組み立て、外部データをHTML文字列へ混ぜないようにする。
   */
  private _createGeneRows(symbol: GeneSymbol, index: number): HTMLDivElement[] {
    const rows = [this._createSymbolRow(symbol, index)];
    const aliases = getSynonyms(symbol.synonyms);

    if (aliases.length > 0) {
      rows.push(
        createEl('div', {
          children: [
            createEl('dt', { text: 'Alias' }),
            createEl('dd', { text: aliases.join(', ') }),
          ],
        })
      );
    }

    return rows;
  }

  /**
   * 公式シンボルは詳細ページへの導線になるため、リンク属性をここで一括設定する。
   */
  private _createSymbolRow(
    symbol: GeneSymbol,
    index: number
  ): HTMLDivElement {
    return createEl('div', {
      class: index > 0 ? '-group-start' : '',
      children: [
        createEl('dt', { text: 'Symbol' }),
        createEl('dd', {
          children: [
            createEl('a', {
              class: 'hyper-text -internal',
              attrs: {
                href: `/gene/${encodeURIComponent(String(symbol.id))}`,
                target: '_blank',
                rel: 'noopener noreferrer',
              },
              text: symbol.name,
            }),
          ],
        }),
      ],
    });
  }
}
