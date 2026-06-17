import { storeManager } from '../../store/StoreManager';
import {
  getInitialColumnWidth,
  getMinColumnWidth,
  normalizeColumnConfigs,
  usesInitialColumnWidth,
} from '../../columns';

const AUTO_SIZE_EXTRA_WIDTH = 4;

/**
 * 検索結果テーブルの各列幅をコンテンツの実測値に合わせて自動調整するクラス。
 * 列幅をCSSやデータ定義で静的に管理すると多言語・可変コンテンツに対応しにくいため、
 * DOMの実測値を使ってレンダリング後に動的に確定する。
 */
export class ResultsColumnAutoSizer {
  private tbody: HTMLElement;
  /** 同じ検索結果に対する二重実行を防ぐための署名キャッシュ */
  private autoSizedResultSignature = '';
  /** ユーザーが手動でリサイズした列は自動調整から除外するためにIDを保持する */
  private resizedColumnIds = new Set<string>();
  private boundAutoSizeResultColumns: (_event: Event) => void;
  private boundResetAutoSizeState: (_version: number) => void;
  /** getBoundingClientRect はDOMに配置されていないと0を返すため、非表示テーブルで計測する */
  private measuringTable: HTMLTableElement | null = null;
  private measuringRow: HTMLTableRowElement | null = null;

  constructor(tbody: HTMLElement) {
    this.tbody = tbody;
    this.boundAutoSizeResultColumns = this.autoSizeResultColumns.bind(this);
    this.boundResetAutoSizeState = () => this.resetAutoSizeState();
    window.addEventListener('togovar:results-rendered', this.boundAutoSizeResultColumns);
    storeManager.subscribe('resultsResetVersion', this.boundResetAutoSizeState);
  }

  /** イベントリスナーと計測用DOMを同時に破棄し、メモリリークを防ぐ。 */
  destroy(): void {
    window.removeEventListener('togovar:results-rendered', this.boundAutoSizeResultColumns);
    storeManager.unsubscribe('resultsResetVersion', this.boundResetAutoSizeState);
    this.measuringTable?.remove();
    this.measuringTable = null;
    this.measuringRow = null;
  }

  /**
   * 指定列だけをコンテンツの実測幅に合わせる。
   * ドラッグリサイズと異なり「ユーザーが明示的に幅を固定した」とは見なさないため、
   * markColumnResized を呼ばない。次の検索結果で再度自動調整される。
   */
  autoSizeColumn(columnId: string): void {
    const columns = normalizeColumnConfigs(storeManager.getData('columns'));
    const column = columns.find((c) => c.id === columnId);
    if (!column || !column.isUsed || usesInitialColumnWidth(columnId)) return;

    const contentWidth = this.measureColumnContentWidth(columnId);
    const width =
      contentWidth <= 0
        ? getMinColumnWidth()
        : Math.max(getMinColumnWidth(), contentWidth);

    storeManager.setData(
      'columns',
      columns.map((c) => (c.id === columnId ? { ...c, width } : c))
    );
  }

  /** 列リセット時に署名とリサイズ記録を同時にクリアして次回自動調整を有効にする。 */
  resetAutoSizeState(): void {
    this.autoSizedResultSignature = '';
    this.resizedColumnIds.clear();
  }

  /** 検索条件変更だけで結果が変わっていない場合に再調整を強制するための署名クリア。 */
  resetSignature(): void {
    this.autoSizedResultSignature = '';
  }

  /** ユーザーが手動でリサイズした列を記録し、自動調整による上書きを防ぐ。 */
  markColumnResized(columnId: string): void {
    this.resizedColumnIds.add(columnId);
  }

  /**
   * 全列幅を初期値に戻し、次回の自動調整を有効にする。
   */
  resetColumnWidths(): void {
    this.resetAutoSizeState();

    const columns = normalizeColumnConfigs(storeManager.getData('columns')).map((column) => ({
      ...column,
      width: getInitialColumnWidth(column.id),
    }));

    storeManager.setData('columns', columns);
  }

  /**
   * 検索結果が変わったときだけ列幅を自動調整する。
   * ページ送りや再描画ごとに呼ばれるが、署名が同じなら処理をスキップして無駄な再計測を防ぐ。
   */
  autoSizeResultColumns(event?: Event): void {
    if (event instanceof CustomEvent && event.detail?.reason !== 'searchResults') {
      return;
    }

    if (storeManager.getData('offset') !== 0) {
      return;
    }

    const resultSignature = this.getResultSignature();
    if (!resultSignature || resultSignature === this.autoSizedResultSignature) {
      return;
    }

    const columns = normalizeColumnConfigs(storeManager.getData('columns'));
    const nextColumns = columns.map((column) => {
      if (!column.isUsed || usesInitialColumnWidth(column.id) || this.resizedColumnIds.has(column.id)) {
        return column;
      }

      const contentWidth = this.measureColumnContentWidth(column.id);
      if (contentWidth <= 0) {
        return { ...column, width: getMinColumnWidth() };
      }

      return { ...column, width: Math.max(getMinColumnWidth(), contentWidth) };
    });

    this.autoSizedResultSignature = resultSignature;
    storeManager.setData('columns', nextColumns);
  }

  /**
   * 結果セット全体をシリアライズすると重いため、先頭IDと総件数の組み合わせで差分を検出する。
   */
  private getResultSignature(): string {
    const results = storeManager.getData('searchResults');
    const numberOfRecords = storeManager.getData('numberOfRecords');

    if (!Array.isArray(results) || results.length === 0) {
      return '';
    }

    const firstResult = results[0] as { id?: unknown };
    return `${numberOfRecords}:${String(firstResult?.id || '')}`;
  }

  /**
   * 指定列のセル群から最大コンテンツ幅を実測して返す。
   */
  private measureColumnContentWidth(columnId: string): number {
    const cellsWithContent = Array.from(
      this.tbody.querySelectorAll<HTMLTableCellElement>(`td.${columnId}`)
    ).flatMap((cell) => {
      if (cell.offsetParent === null) return [];
      const content = this.getMeasureTarget(cell, columnId);
      if (!content?.textContent?.trim()) return [];
      return [{ cell, content }];
    });

    if (cellsWithContent.length === 0) return 0;

    return Math.ceil(
      Math.max(
        ...cellsWithContent.map(({ cell, content }) => {
          const style = window.getComputedStyle(cell);
          const horizontalPadding =
            parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);

          return (
            this.measureContentBoxWidth(cell, content) +
            horizontalPadding +
            AUTO_SIZE_EXTRA_WIDTH
          );
        })
      )
    );
  }

  /**
   * コンテンツの実際の描画幅を複数手法で取得する。
   * 制約なし計測が取れればそれを優先し、取れない場合は RangeAPI と scrollWidth で補完する。
   */
  private measureContentBoxWidth(
    cell: HTMLTableCellElement,
    content: HTMLElement
  ): number {
    const unconstrainedWidth = this.measureUnconstrainedContentWidth(cell, content);
    if (unconstrainedWidth > 0) {
      return unconstrainedWidth;
    }

    const rangeWidth = this.measureRangeWidth(cell, content);
    if (content === cell) {
      return rangeWidth;
    }

    return Math.max(rangeWidth, content.scrollWidth, content.getBoundingClientRect().width);
  }

  /**
   * セルを非表示の計測用テーブルにクローンして幅の制約を外し、コンテンツ本来の幅を得る。
   */
  private measureUnconstrainedContentWidth(
    cell: HTMLTableCellElement,
    content: HTMLElement
  ): number {
    const measuringRow = this.getMeasuringRow();
    const measuringCell = cell.cloneNode(false) as HTMLTableCellElement;

    measuringCell.style.width = 'auto';
    measuringCell.style.minWidth = '0';
    measuringCell.style.maxWidth = 'none';
    measuringCell.style.padding = '0';
    measuringCell.style.overflow = 'visible';
    measuringCell.style.textOverflow = 'clip';

    if (content === cell) {
      Array.from(cell.childNodes).forEach((node) => {
        if (node instanceof HTMLElement && node.classList.contains('resize-bar')) {
          return;
        }
        measuringCell.appendChild(node.cloneNode(true));
      });
    } else {
      measuringCell.appendChild(content.cloneNode(true));
    }

    measuringCell.querySelectorAll<HTMLElement>('*').forEach((element) => {
      element.style.maxWidth = 'none';
      element.style.overflow = 'visible';
      element.style.textOverflow = 'clip';
    });

    measuringRow.replaceChildren(measuringCell);
    const width = measuringCell.getBoundingClientRect().width;
    measuringRow.replaceChildren();
    return width;
  }

  /**
   * 計測用テーブルをキャッシュして再利用するため、DOMへの追加は初回のみにする。
   */
  private getMeasuringRow(): HTMLTableRowElement {
    if (this.measuringRow && this.measuringTable?.isConnected) {
      return this.measuringRow;
    }

    const table = document.createElement('table');
    const tbody = document.createElement('tbody');
    const row = document.createElement('tr');

    table.className = 'results-view';
    table.style.position = 'absolute';
    table.style.left = '-10000px';
    table.style.top = '0';
    table.style.visibility = 'hidden';
    table.style.width = 'auto';
    table.style.tableLayout = 'auto';
    table.style.pointerEvents = 'none';

    tbody.appendChild(row);
    table.appendChild(tbody);
    document.body.appendChild(table);

    this.measuringTable = table;
    this.measuringRow = row;

    return row;
  }

  /**
   * Range API でコンテンツノードを囲んで幅を取得する。
   */
  private measureRangeWidth(cell: HTMLTableCellElement, content: HTMLElement): number {
    const range = document.createRange();

    if (content === cell) {
      const contentNodes = Array.from(cell.childNodes).filter(
        (node) => !(node instanceof HTMLElement && node.classList.contains('resize-bar'))
      );

      if (contentNodes.length === 0) return 0;

      range.setStartBefore(contentNodes[0]);
      range.setEndAfter(contentNodes[contentNodes.length - 1]);
    } else {
      range.selectNodeContents(content);
    }

    return range.getBoundingClientRect().width;
  }

  /**
   * 列IDによってセル内の計測対象サブ要素を切り替える。
   */
  private getMeasureTarget(cell: HTMLTableCellElement, columnId: string): HTMLElement {
    const selectorByColumn: Record<string, string> = {
      ref_alt: '.ref-alt',
      position: '.chromosome-position',
      alphamissense: '.variant-function',
      sift: '.variant-function',
      polyphen: '.variant-function',
    };

    return cell.querySelector<HTMLElement>(selectorByColumn[columnId]) || cell;
  }
}
