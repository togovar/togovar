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
  /** リサイズ中の列ID */
  columnId: string;
  /** ドラッグ開始時のポインターX座標 */
  startX: number;
  /** ドラッグ開始時の列幅 */
  startWidth: number;
  /** ドラッグ中に一時反映する列設定 */
  nextColumns: ColumnConfig[];
};

type ResultsColumnResizeControllerOptions = {
  /** 結果テーブルのヘッダー */
  thead: HTMLElement;
  /** 結果テーブルのボディ */
  tbody: HTMLElement;
  /** 結果テーブルを囲むスクロールコンテナ */
  tablecontainer: HTMLElement;
  /** 自動列幅調整の状態管理 */
  autoSizer: ResultsColumnAutoSizer;
  /** ドラッグ中の列幅を store 保存前に画面へ反映するコールバック */
  previewColumns: (_columns: ColumnConfig[]) => void;
};

/**
 * 検索結果テーブルの列リサイズ操作を管理するクラス。
 *
 * pointer イベントの登録・解除、ドラッグ中の列幅プレビュー、リサイズ対象列の
 * hover 表示、列幅リセットを担当する。確定した列幅は storeManager に保存する。
 */
export class ResultsColumnResizeController {
  private thead: HTMLElement;
  private tbody: HTMLElement;
  private tablecontainer: HTMLElement;
  private autoSizer: ResultsColumnAutoSizer;
  private previewColumns: (_columns: ColumnConfig[]) => void;
  private columnBorderStylesheet!: HTMLStyleElement;
  private resizeState: ColumnResizeState | null = null;
  /** pointerup 後の click を一度だけ抑制するフラグ */
  private wasDragging = false;
  /** drag 終了後の hover 判定で使う最後のポインター座標 */
  private lastPointerX = 0;
  private lastPointerY = 0;
  private boundColumnResizeStart: (_e: PointerEvent) => void;
  private boundColumnResizeMove: (_e: PointerEvent) => void;
  private boundColumnResizeEnd: () => void;
  private boundAutoSizeColumnOnDblClick: (_e: MouseEvent) => void;
  private boundStopClickOnResizeBar: (_e: MouseEvent) => void;
  private boundResizeHoverOver: (_e: MouseEvent) => void;
  private boundResizeHoverLeave: () => void;

  constructor(options: ResultsColumnResizeControllerOptions) {
    this.thead = options.thead;
    this.tbody = options.tbody;
    this.tablecontainer = options.tablecontainer;
    this.autoSizer = options.autoSizer;
    this.previewColumns = options.previewColumns;

    this.boundColumnResizeStart = this.startColumnResize.bind(this);
    this.boundColumnResizeMove = this.moveColumnResize.bind(this);
    this.boundColumnResizeEnd = this.endColumnResize.bind(this);
    this.boundAutoSizeColumnOnDblClick = this.onResizeBarDblClick.bind(this);
    this.boundStopClickOnResizeBar = (e: MouseEvent) => {
      if (this.wasDragging) {
        this.wasDragging = false;
        e.stopPropagation();
        return;
      }
      if (e.target instanceof Element && e.target.closest('.resize-bar')) {
        e.stopPropagation();
      }
    };
    this.boundResizeHoverOver = this.onResizeHoverOver.bind(this);
    this.boundResizeHoverLeave = this.onResizeHoverLeave.bind(this);

    this.attachEventHandlers();
    this.createColumnBorderStyles();
  }

  /**
   * 登録したイベントリスナーと動的 stylesheet を破棄する。
   */
  destroy(): void {
    this.thead.removeEventListener('pointerdown', this.boundColumnResizeStart);
    this.thead.removeEventListener('dblclick', this.boundAutoSizeColumnOnDblClick);
    this.tbody.removeEventListener('dblclick', this.boundAutoSizeColumnOnDblClick);
    this.tbody.removeEventListener('click', this.boundStopClickOnResizeBar, true);
    document.removeEventListener('pointermove', this.boundColumnResizeMove);
    document.removeEventListener('pointerup', this.boundColumnResizeEnd);
    document.removeEventListener('pointercancel', this.boundColumnResizeEnd);
    this.tbody.removeEventListener('pointerdown', this.boundColumnResizeStart);
    this.tablecontainer.removeEventListener('mouseover', this.boundResizeHoverOver);
    this.tablecontainer.removeEventListener('mouseleave', this.boundResizeHoverLeave);

    if (this.columnBorderStylesheet) {
      this.columnBorderStylesheet.remove();
    }

    this.resizeState = null;
    delete document.body.dataset.columnResizing;
    delete this.tablecontainer.dataset.resizeHover;
  }

  /**
   * 列リサイズに必要な pointer / hover / reset イベントを登録する。
   */
  private attachEventHandlers(): void {
    this.thead.addEventListener('pointerdown', this.boundColumnResizeStart);
    this.tbody.addEventListener('pointerdown', this.boundColumnResizeStart);
    this.thead.addEventListener('dblclick', this.boundAutoSizeColumnOnDblClick);
    this.tbody.addEventListener('dblclick', this.boundAutoSizeColumnOnDblClick);
    // キャプチャフェーズで登録することで、tr のサイドバーハンドラーより先に伝播を止める。
    this.tbody.addEventListener('click', this.boundStopClickOnResizeBar, true);
    document.addEventListener('pointermove', this.boundColumnResizeMove);
    document.addEventListener('pointerup', this.boundColumnResizeEnd);
    document.addEventListener('pointercancel', this.boundColumnResizeEnd);
    this.tablecontainer.addEventListener('mouseover', this.boundResizeHoverOver);
    this.tablecontainer.addEventListener('mouseleave', this.boundResizeHoverLeave);
  }

  /**
   * resize-bar を掴んだときにドラッグ状態を開始する。
   */
  private startColumnResize(e: PointerEvent): void {
    const resizeBar = (e.target as HTMLElement).closest<HTMLElement>('.resize-bar');
    if (!resizeBar) return;

    const cell = resizeBar.closest<HTMLTableCellElement>('th, td');
    const columnId = resizeBar.dataset.columnId || cell?.dataset.columnId;
    if (!cell || !columnId) return;
    if (!isColumnResizable(columnId)) return;

    e.preventDefault();
    e.stopPropagation();

    // ユーザーが明示的に幅変更した列は、自動列幅調整の対象から外す。
    this.autoSizer.markColumnResized(columnId);

    const columns = normalizeColumnConfigs(storeManager.getData('columns'));
    const column = columns.find((item) => item.id === columnId);
    const startWidth = column?.width || Math.round(cell.getBoundingClientRect().width);

    this.resizeState = {
      columnId,
      startX: e.clientX,
      startWidth,
      nextColumns: columns,
    };
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    document.body.dataset.columnResizing = 'true';
    this.tablecontainer.dataset.resizeHover = columnId;
  }

  /**
   * ドラッグ中の移動量から列幅を計算し、画面へ一時反映する。
   */
  private moveColumnResize(e: PointerEvent): void {
    if (!this.resizeState) return;

    e.preventDefault();
    this.wasDragging = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    const { columnId, startX, startWidth } = this.resizeState;
    const minWidth = getMinColumnWidth();
    const nextWidth = Math.max(minWidth, Math.round(startWidth + e.clientX - startX));

    this.resizeState.nextColumns = this.resizeState.nextColumns.map((column) =>
      column.id === columnId ? { ...column, width: nextWidth } : column
    );
    this.previewColumns(this.resizeState.nextColumns);
  }

  /**
   * ドラッグを終了し、確定した列幅を store に保存する。
   */
  private endColumnResize(): void {
    if (!this.resizeState) return;

    storeManager.setData('columns', this.resizeState.nextColumns);
    this.resizeState = null;
    delete document.body.dataset.columnResizing;

    const x = this.lastPointerX;
    const y = this.lastPointerY;
    // pointerup と同タスクの click が処理された後に実行されるため、
    // click が発火しなかった場合のフラグ残留をここで解消する。
    requestAnimationFrame(() => {
      this.wasDragging = false;
      if (!document.elementFromPoint(x, y)?.closest('.resize-bar')) {
        delete this.tablecontainer.dataset.resizeHover;
      }
    });
  }

  /**
   * resize-bar の hover 対象列を tablecontainer の data 属性へ反映する。
   */
  private onResizeHoverOver(e: MouseEvent): void {
    if (this.resizeState) return;
    const resizeBar = (e.target as HTMLElement).closest<HTMLElement>('.resize-bar');
    if (!resizeBar) {
      delete this.tablecontainer.dataset.resizeHover;
      return;
    }
    const cell = resizeBar.closest<HTMLElement>('th[data-column-id]');
    const columnId = cell
      ? cell.dataset.columnId
      : (() => {
          // tbody 側の resize-bar では cellIndex から対応する th を引く。
          const td = resizeBar.closest<HTMLTableCellElement>('td');
          if (!td) return undefined;
          return this.thead.querySelectorAll<HTMLElement>('th')[td.cellIndex]?.dataset.columnId;
        })();
    if (columnId) {
      this.tablecontainer.dataset.resizeHover = columnId;
    }
  }

  /**
   * テーブル外へ出たら hover 表示を解除する。
   */
  private onResizeHoverLeave(): void {
    if (!this.resizeState) {
      delete this.tablecontainer.dataset.resizeHover;
    }
  }

  /**
   * リサイズ対象列の縦境界線を表示するための CSS ルールを生成する。
   */
  private createColumnBorderStyles(): void {
    this.columnBorderStylesheet = document.createElement('style');
    document.head.appendChild(this.columnBorderStylesheet);
    const sheet = this.columnBorderStylesheet.sheet;
    if (!sheet) return;
    COLUMNS.forEach((column) => {
      const idleBase = `.tablecontainer .results-view`;
      const base = `.tablecontainer[data-resize-hover="${column.id}"] .results-view`;
      const baseResizing = `body[data-column-resizing="true"] ${base}`;
      // 通常時も透明な境界線を持たせ、hover 解除時にも transition が効くようにする
      sheet.insertRule(
        `${idleBase} th.${column.id}::after { content: ''; position: absolute; right: 0; bottom: 0; width: 2px; height: 20px; background-color: rgba(17,127,147,0); opacity: 0; transform: scaleY(0.7); transform-origin: bottom; pointer-events: none; transition: opacity 300ms ease, transform 140ms ease, background-color 140ms ease; }`
      );
      sheet.insertRule(
        `${idleBase} td.${column.id} { box-shadow: inset -2px 0 0 rgba(17,127,147,0); transition: box-shadow 300ms ease; }`
      );
      // hover 時 th: ::after で高さ固定（th 全体の高さに依存しない）
      sheet.insertRule(
        `${base} th.${column.id}::after { background-color: rgba(17,127,147,0.15); opacity: 1; transform: scaleY(1); }`
      );
      // hover 時 td: box-shadow（行高さに追従）
      sheet.insertRule(
        `${base} td.${column.id} { box-shadow: inset -2px 0 0 rgba(17,127,147,0.15); }`
      );
      // drag 中 th: hover 時より濃い境界線にする
      sheet.insertRule(
        `${baseResizing} th.${column.id}::after { background-color: rgba(17,127,147,0.5); }`
      );
      // drag 中 td: hover 時より濃い境界線にする
      sheet.insertRule(
        `${baseResizing} td.${column.id} { box-shadow: inset -2px 0 0 rgba(17,127,147,0.5); }`
      );
    });
  }

  /**
   * resize-bar のダブルクリックで対象列をコンテンツ最大幅に自動調整する。
   */
  private onResizeBarDblClick(e: MouseEvent): void {
    const resizeBar = (e.target as HTMLElement).closest<HTMLElement>('.resize-bar');
    if (!resizeBar) return;

    e.stopPropagation();
    e.preventDefault();

    const cell = resizeBar.closest<HTMLTableCellElement>('th, td');
    const columnId = resizeBar.dataset.columnId || cell?.dataset.columnId;
    if (!columnId) return;

    this.autoSizer.autoSizeColumn(columnId);
  }
}
