import { storeManager } from '../../store/StoreManager';
import {
  getInitialColumnWidth,
  getMinColumnWidth,
  normalizeColumnConfigs,
  usesInitialColumnWidth,
} from '../../columns';

const AUTO_SIZE_EXTRA_WIDTH = 4;

export class ResultsColumnAutoSizer {
  private _tbody: HTMLElement;
  private _autoSizedResultSignature = '';
  private _resizedColumnIds = new Set<string>();
  private _boundAutoSizeResultColumns: (_event: Event) => void;
  private _measuringTable: HTMLTableElement | null = null;
  private _measuringRow: HTMLTableRowElement | null = null;

  constructor(tbody: HTMLElement) {
    this._tbody = tbody;
    this._boundAutoSizeResultColumns = this.autoSizeResultColumns.bind(this);
    window.addEventListener(
      'togovar:results-rendered',
      this._boundAutoSizeResultColumns
    );
  }

  destroy(): void {
    window.removeEventListener(
      'togovar:results-rendered',
      this._boundAutoSizeResultColumns
    );
    this._measuringTable?.remove();
    this._measuringTable = null;
    this._measuringRow = null;
  }

  resetSignature(): void {
    this._autoSizedResultSignature = '';
  }

  markColumnResized(columnId: string): void {
    this._resizedColumnIds.add(columnId);
  }

  resetColumnWidths(): void {
    this._autoSizedResultSignature = '';
    this._resizedColumnIds.clear();

    const columns = normalizeColumnConfigs(storeManager.getData('columns')).map(
      (column) => ({
        ...column,
        width: getInitialColumnWidth(column.id),
      })
    );

    storeManager.setData('columns', columns);
  }

  autoSizeResultColumns(event?: Event): void {
    if (
      event instanceof CustomEvent &&
      event.detail?.reason !== 'searchResults'
    ) {
      return;
    }

    if (storeManager.getData('offset') !== 0) {
      return;
    }

    const resultSignature = this._getResultSignature();
    if (
      !resultSignature ||
      resultSignature === this._autoSizedResultSignature
    ) {
      return;
    }

    const columns = normalizeColumnConfigs(storeManager.getData('columns'));
    const nextColumns = columns.map((column) => {
      if (
        !column.isUsed ||
        usesInitialColumnWidth(column.id) ||
        this._resizedColumnIds.has(column.id)
      ) {
        return column;
      }

      const contentWidth = this._measureColumnContentWidth(column.id);
      if (contentWidth <= 0) {
        return { ...column, width: getMinColumnWidth() };
      }

      const width = Math.max(getMinColumnWidth(), contentWidth);

      return { ...column, width };
    });

    this._autoSizedResultSignature = resultSignature;
    storeManager.setData('columns', nextColumns);
  }

  private _getResultSignature(): string {
    const results = storeManager.getData('searchResults');
    const numberOfRecords = storeManager.getData('numberOfRecords');

    if (!Array.isArray(results) || results.length === 0) {
      return '';
    }

    const firstResult = results[0] as { id?: unknown };
    return `${numberOfRecords}:${String(firstResult?.id || '')}`;
  }

  private _measureColumnContentWidth(columnId: string): number {
    const cells = Array.from(
      this._tbody.querySelectorAll<HTMLTableCellElement>(`td.${columnId}`)
    ).filter((cell) => {
      if (cell.offsetParent === null) return false;
      const content = this._getMeasureTarget(cell, columnId);
      return Boolean(content?.textContent?.trim());
    });
    if (cells.length === 0) return 0;

    return Math.ceil(
      Math.max(
        ...cells.map((cell) => {
          const content = this._getMeasureTarget(cell, columnId);
          if (!content || !content.textContent?.trim()) return 0;

          const style = window.getComputedStyle(cell);
          const horizontalPadding =
            parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);

          return (
            this._measureContentBoxWidth(cell, content) +
            horizontalPadding +
            AUTO_SIZE_EXTRA_WIDTH
          );
        })
      )
    );
  }

  private _measureContentBoxWidth(
    cell: HTMLTableCellElement,
    content: HTMLElement
  ): number {
    const unconstrainedWidth = this._measureUnconstrainedContentWidth(
      cell,
      content
    );
    if (unconstrainedWidth > 0) {
      return unconstrainedWidth;
    }

    const rangeWidth = this._measureRangeWidth(cell, content);
    if (content === cell) {
      return rangeWidth;
    }

    return Math.max(
      rangeWidth,
      content.scrollWidth,
      content.getBoundingClientRect().width
    );
  }

  private _measureUnconstrainedContentWidth(
    cell: HTMLTableCellElement,
    content: HTMLElement
  ): number {
    const measuringRow = this._getMeasuringRow();
    const measuringCell = cell.cloneNode(false) as HTMLTableCellElement;

    measuringCell.style.width = 'auto';
    measuringCell.style.minWidth = '0';
    measuringCell.style.maxWidth = 'none';
    measuringCell.style.padding = '0';
    measuringCell.style.overflow = 'visible';
    measuringCell.style.textOverflow = 'clip';

    if (content === cell) {
      Array.from(cell.childNodes).forEach((node) => {
        if (
          node instanceof HTMLElement &&
          node.classList.contains('resize-bar')
        ) {
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

  private _getMeasuringRow(): HTMLTableRowElement {
    if (this._measuringRow && this._measuringTable?.isConnected) {
      return this._measuringRow;
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

    this._measuringTable = table;
    this._measuringRow = row;

    return row;
  }

  private _measureRangeWidth(
    cell: HTMLTableCellElement,
    content: HTMLElement
  ): number {
    const range = document.createRange();

    if (content === cell) {
      const contentNodes = Array.from(cell.childNodes).filter((node) => {
        return !(
          node instanceof HTMLElement && node.classList.contains('resize-bar')
        );
      });

      if (contentNodes.length === 0) {
        return 0;
      }

      range.setStartBefore(contentNodes[0]);
      range.setEndAfter(contentNodes[contentNodes.length - 1]);
    } else {
      range.selectNodeContents(content);
    }

    const width = range.getBoundingClientRect().width;
    return width;
  }

  private _getMeasureTarget(
    cell: HTMLTableCellElement,
    columnId: string
  ): HTMLElement {
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
