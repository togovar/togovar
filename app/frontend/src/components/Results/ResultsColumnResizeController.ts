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
  /** 結果テーブルのヘッダー */
  private _thead: HTMLElement;
  /** 結果テーブルのボディ */
  private _tbody: HTMLElement;
  /** 結果テーブルを囲むスクロールコンテナ */
  private _tablecontainer: HTMLElement;
  /** 自動列幅調整の状態管理 */
  private _autoSizer: ResultsColumnAutoSizer;
  /** ドラッグ中の列幅を画面へ即時反映するコールバック */
  private _previewColumns: (_columns: ColumnConfig[]) => void;
  /** リサイズ対象列の境界線を表示するための動的 stylesheet */
  private _columnBorderStylesheet!: HTMLStyleElement;
  /** 現在のドラッグリサイズ状態。リサイズ中でなければ null */
  private _resizeState: ColumnResizeState | null = null;
  /** ドラッグが発生したことを示すフラグ。pointerup 後の click を一度だけ抑制するために使う */
  private _wasDragging = false;
  /** 最後に観測したポインターX座標。drag 終了後の hover 判定で使う */
  private _lastPointerX = 0;
  /** 最後に観測したポインターY座標。drag 終了後の hover 判定で使う */
  private _lastPointerY = 0;
  private _boundColumnResizeStart: (_e: PointerEvent) => void;
  private _boundColumnResizeMove: (_e: PointerEvent) => void;
  private _boundColumnResizeEnd: () => void;
  private _boundAutoSizeColumnOnDblClick: (_e: MouseEvent) => void;
  private _boundStopClickOnResizeBar: (_e: MouseEvent) => void;
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
    this._boundAutoSizeColumnOnDblClick = this._onResizeBarDblClick.bind(this);
    this._boundStopClickOnResizeBar = (e: MouseEvent) => {
      if (this._wasDragging) {
        this._wasDragging = false;
        e.stopPropagation();
        return;
      }
      if ((e.target as HTMLElement).closest('.resize-bar')) e.stopPropagation();
    };
    this._boundResizeHoverOver = this._onResizeHoverOver.bind(this);
    this._boundResizeHoverLeave = this._onResizeHoverLeave.bind(this);

    this._attachEventHandlers();
    this._createColumnBorderStyles();
  }

  /**
   * 登録したイベントリスナーと動的 stylesheet を破棄する。
   */
  destroy(): void {
    this._thead.removeEventListener(
      'pointerdown',
      this._boundColumnResizeStart
    );
    this._thead.removeEventListener('dblclick', this._boundAutoSizeColumnOnDblClick);
    this._tbody.removeEventListener('dblclick', this._boundAutoSizeColumnOnDblClick);
    this._tbody.removeEventListener('click', this._boundStopClickOnResizeBar, true);
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

    this._resizeState = null;
    delete document.body.dataset.columnResizing;
    delete this._tablecontainer.dataset.resizeHover;
  }

  /**
   * 列リサイズに必要な pointer / hover / reset イベントを登録する。
   */
  private _attachEventHandlers(): void {
    this._thead.addEventListener('pointerdown', this._boundColumnResizeStart);
    this._tbody.addEventListener('pointerdown', this._boundColumnResizeStart);
    this._thead.addEventListener('dblclick', this._boundAutoSizeColumnOnDblClick);
    this._tbody.addEventListener('dblclick', this._boundAutoSizeColumnOnDblClick);
    // キャプチャフェーズで登録することで、tr のサイドバーハンドラーより先に伝播を止める。
    // バブリング登録だと tbody に届いた時点でサイドバー側がすでに実行済みになる。
    this._tbody.addEventListener('click', this._boundStopClickOnResizeBar, true);
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

  /**
   * resize-bar を掴んだときにドラッグ状態を開始する。
   */
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

    // ユーザーが明示的に幅変更した列は、自動列幅調整の対象から外す。
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
    // CSS 側でドラッグ中の境界線表示を切り替えるためのフラグ。
    document.body.dataset.columnResizing = 'true';
    this._tablecontainer.dataset.resizeHover = columnId;
  }

  /**
   * ドラッグ中の移動量から列幅を計算し、画面へ一時反映する。
   */
  private _moveColumnResize(e: PointerEvent): void {
    if (!this._resizeState) return;

    e.preventDefault();
    this._wasDragging = true;
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

  /**
   * ドラッグを終了し、確定した列幅を store に保存する。
   */
  private _endColumnResize(): void {
    if (!this._resizeState) return;

    storeManager.setData('columns', this._resizeState.nextColumns);
    this._resizeState = null;
    delete document.body.dataset.columnResizing;

    const x = this._lastPointerX;
    const y = this._lastPointerY;
    // pointerup と同タスクの click が処理された後に実行されるため、
    // click が発火しなかった場合（テーブル外で離す等）のフラグ残留をここで解消する。
    // click が発火した場合はキャプチャハンドラーが先にクリア済みなので no-op になる。
    requestAnimationFrame(() => {
      this._wasDragging = false;
      if (!document.elementFromPoint(x, y)?.closest('.resize-bar')) {
        delete this._tablecontainer.dataset.resizeHover;
      }
    });
  }

  /**
   * resize-bar の hover 対象列を tablecontainer の data 属性へ反映する。
   */
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
          // tbody 側の resize-bar では cellIndex から対応する th を引く。
          const td = resizeBar.closest<HTMLTableCellElement>('td');
          if (!td) return undefined;
          return this._thead.querySelectorAll<HTMLElement>('th')[td.cellIndex]
            ?.dataset.columnId;
        })();
    if (columnId) {
      this._tablecontainer.dataset.resizeHover = columnId;
    }
  }

  /**
   * テーブル外へ出たら hover 表示を解除する。
   */
  private _onResizeHoverLeave(): void {
    if (!this._resizeState) {
      delete this._tablecontainer.dataset.resizeHover;
    }
  }

  /**
   * リサイズ対象列の縦境界線を表示するための CSS ルールを生成する。
   */
  private _createColumnBorderStyles(): void {
    this._columnBorderStylesheet = document.createElement('style');
    document.head.appendChild(this._columnBorderStylesheet);
    const sheet = this._columnBorderStylesheet.sheet;
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
   * tbody 側は行クリック（サイドバー表示）と競合するため、resize-bar 上の場合だけ
   * stopPropagation と preventDefault で行選択イベントの伝播を止める。
   */
  private _onResizeBarDblClick(e: MouseEvent): void {
    const resizeBar = (e.target as HTMLElement).closest<HTMLElement>('.resize-bar');
    if (!resizeBar) return;

    e.stopPropagation();
    e.preventDefault();

    const cell = resizeBar.closest<HTMLTableCellElement>('th, td');
    const columnId = resizeBar.dataset.columnId || cell?.dataset.columnId;
    if (!columnId) return;

    this._autoSizer.autoSizeColumn(columnId);
  }
}
