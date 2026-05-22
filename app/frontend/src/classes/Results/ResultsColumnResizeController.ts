import { storeManager } from '../../store/StoreManager';
import {
  COLUMNS,
  getMinColumnWidth,
  isColumnResizable,
  normalizeColumnConfigs,
} from '../../columns';
import type { ColumnConfig } from '../../types';
import type { ResultsColumnAutoSizer } from './ResultsColumnAutoSizer';

type ColumnResizeState = {
  columnId: string;
  startX: number;
  startWidth: number;
  nextColumns: ColumnConfig[];
};

type ResultsColumnResizeControllerOptions = {
  thead: HTMLElement;
  tbody: HTMLElement;
  tablecontainer: HTMLElement;
  autoSizer: ResultsColumnAutoSizer;
  previewColumns: (_columns: ColumnConfig[]) => void;
};

export class ResultsColumnResizeController {
  private _thead: HTMLElement;
  private _tbody: HTMLElement;
  private _tablecontainer: HTMLElement;
  private _autoSizer: ResultsColumnAutoSizer;
  private _previewColumns: (_columns: ColumnConfig[]) => void;
  private _columnBorderStylesheet!: HTMLStyleElement;
  private _resizeState: ColumnResizeState | null = null;
  private _lastPointerX = 0;
  private _lastPointerY = 0;
  private _boundColumnResizeStart: (_e: PointerEvent) => void;
  private _boundColumnResizeMove: (_e: PointerEvent) => void;
  private _boundColumnResizeEnd: () => void;
  private _boundColumnResizeReset: (_e: MouseEvent) => void;
  private _boundResizeHoverOver: (_e: MouseEvent) => void;
  private _boundResizeHoverLeave: () => void;

  constructor(options: ResultsColumnResizeControllerOptions) {
    this._thead = options.thead;
    this._tbody = options.tbody;
    this._tablecontainer = options.tablecontainer;
    this._autoSizer = options.autoSizer;
    this._previewColumns = options.previewColumns;

    this._boundColumnResizeStart = this._startColumnResize.bind(this);
    this._boundColumnResizeMove = this._moveColumnResize.bind(this);
    this._boundColumnResizeEnd = this._endColumnResize.bind(this);
    this._boundColumnResizeReset = this._resetColumnWidths.bind(this);
    this._boundResizeHoverOver = this._onResizeHoverOver.bind(this);
    this._boundResizeHoverLeave = this._onResizeHoverLeave.bind(this);

    this._attachEventHandlers();
    this._createColumnBorderStyles();
  }

  destroy(): void {
    this._thead.removeEventListener(
      'pointerdown',
      this._boundColumnResizeStart
    );
    this._thead.removeEventListener('dblclick', this._boundColumnResizeReset);
    document.removeEventListener('pointermove', this._boundColumnResizeMove);
    document.removeEventListener('pointerup', this._boundColumnResizeEnd);
    document.removeEventListener('pointercancel', this._boundColumnResizeEnd);
    this._tbody.removeEventListener(
      'pointerdown',
      this._boundColumnResizeStart
    );
    this._tablecontainer.removeEventListener(
      'mouseover',
      this._boundResizeHoverOver
    );
    this._tablecontainer.removeEventListener(
      'mouseleave',
      this._boundResizeHoverLeave
    );

    if (this._columnBorderStylesheet) {
      this._columnBorderStylesheet.remove();
    }
  }

  private _attachEventHandlers(): void {
    this._thead.addEventListener('pointerdown', this._boundColumnResizeStart);
    this._tbody.addEventListener('pointerdown', this._boundColumnResizeStart);
    this._thead.addEventListener('dblclick', this._boundColumnResizeReset);
    document.addEventListener('pointermove', this._boundColumnResizeMove);
    document.addEventListener('pointerup', this._boundColumnResizeEnd);
    document.addEventListener('pointercancel', this._boundColumnResizeEnd);
    this._tablecontainer.addEventListener(
      'mouseover',
      this._boundResizeHoverOver
    );
    this._tablecontainer.addEventListener(
      'mouseleave',
      this._boundResizeHoverLeave
    );
  }

  private _startColumnResize(e: PointerEvent): void {
    const resizeBar = (e.target as HTMLElement).closest<HTMLElement>(
      '.resize-bar'
    );
    if (!resizeBar) return;

    const cell = resizeBar.closest<HTMLTableCellElement>('th, td');
    const columnId = resizeBar.dataset.columnId || cell?.dataset.columnId;
    if (!cell || !columnId) return;
    if (!isColumnResizable(columnId)) return;

    e.preventDefault();
    e.stopPropagation();

    this._autoSizer.markColumnResized(columnId);

    const columns = normalizeColumnConfigs(storeManager.getData('columns'));
    const column = columns.find((item) => item.id === columnId);
    const startWidth =
      column?.width || Math.round(cell.getBoundingClientRect().width);

    this._resizeState = {
      columnId,
      startX: e.clientX,
      startWidth,
      nextColumns: columns,
    };
    this._lastPointerX = e.clientX;
    this._lastPointerY = e.clientY;
    document.body.dataset.columnResizing = 'true';
    this._tablecontainer.dataset.resizeHover = columnId;
  }

  private _moveColumnResize(e: PointerEvent): void {
    if (!this._resizeState) return;

    e.preventDefault();
    this._lastPointerX = e.clientX;
    this._lastPointerY = e.clientY;

    const { columnId, startX, startWidth } = this._resizeState;
    const minWidth = getMinColumnWidth();
    const nextWidth = Math.max(
      minWidth,
      Math.round(startWidth + e.clientX - startX)
    );

    this._resizeState.nextColumns = this._resizeState.nextColumns.map(
      (column) =>
        column.id === columnId ? { ...column, width: nextWidth } : column
    );
    this._previewColumns(this._resizeState.nextColumns);
  }

  private _endColumnResize(): void {
    if (!this._resizeState) return;

    storeManager.setData('columns', this._resizeState.nextColumns);
    this._resizeState = null;
    delete document.body.dataset.columnResizing;

    const x = this._lastPointerX;
    const y = this._lastPointerY;
    requestAnimationFrame(() => {
      if (!document.elementFromPoint(x, y)?.closest('.resize-bar')) {
        delete this._tablecontainer.dataset.resizeHover;
      }
    });
  }

  private _onResizeHoverOver(e: MouseEvent): void {
    if (this._resizeState) return;
    const resizeBar = (e.target as HTMLElement).closest<HTMLElement>(
      '.resize-bar'
    );
    if (!resizeBar) {
      delete this._tablecontainer.dataset.resizeHover;
      return;
    }
    const cell = resizeBar.closest<HTMLElement>('th[data-column-id]');
    const columnId = cell
      ? cell.dataset.columnId
      : (() => {
          const td = resizeBar.closest<HTMLTableCellElement>('td');
          if (!td) return undefined;
          return this._thead.querySelectorAll<HTMLElement>('th')[td.cellIndex]
            ?.dataset.columnId;
        })();
    if (columnId) {
      this._tablecontainer.dataset.resizeHover = columnId;
    }
  }

  private _onResizeHoverLeave(): void {
    if (!this._resizeState) {
      delete this._tablecontainer.dataset.resizeHover;
    }
  }

  private _createColumnBorderStyles(): void {
    this._columnBorderStylesheet = document.createElement('style');
    document.head.appendChild(this._columnBorderStylesheet);
    const sheet = this._columnBorderStylesheet.sheet;
    if (!sheet) return;
    COLUMNS.forEach((column) => {
      const base = `.tablecontainer[data-resize-hover="${column.id}"] .results-view`;
      const baseResizing = `body[data-column-resizing="true"] ${base}`;
      sheet.insertRule(
        `${base} th.${column.id}::after { content: ''; position: absolute; right: 0; bottom: 0; width: 2px; height: 20px; background: rgba(17,127,147,0.15); pointer-events: none; }`
      );
      sheet.insertRule(
        `${base} td.${column.id} { box-shadow: inset -2px 0 0 rgba(17,127,147,0.15); }`
      );
      sheet.insertRule(
        `${baseResizing} th.${column.id}::after { background: rgba(17,127,147,0.5); }`
      );
      sheet.insertRule(
        `${baseResizing} td.${column.id} { box-shadow: inset -2px 0 0 rgba(17,127,147,0.5); }`
      );
    });
  }

  private _resetColumnWidths(e: MouseEvent): void {
    if (!(e.target as HTMLElement).closest('thead')) return;

    this._autoSizer.resetColumnWidths();
  }
}
