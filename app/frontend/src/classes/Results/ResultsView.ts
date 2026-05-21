import { storeManager } from '../../store/StoreManager';
import {
  getInitialColumnWidth,
  getMinColumnWidth,
  getOrderedColumns,
  isColumnResizable,
  normalizeColumnConfigs,
  usesInitialColumnWidth,
} from '../../columns';
import { ResultsScrollBar } from './ResultsScrollBar';
import { ResultsColumnsDropdown } from './ResultsColumnsDropdown';
import { keyDownEvent } from '../../utils/keyDownEvent.js';
import { ResultsViewTouchHandler } from './ResultsViewTouchHandler';
import { ResultsViewDataManager } from './ResultsViewDataManager';
import type { SearchMessages, SearchStatus, ColumnConfig } from '../../types';
import { isTouchDevice } from '../../utils/deviceDetection';

/** テーブル関連の DOM セレクタマップ */
const SELECTORS = {
  STATUS: 'header.header > .left > .status',
  MESSAGES: '#Messages',
  TABLE_CONTAINER: '.tablecontainer',
  TABLE_THEAD: '.tablecontainer > table.results-view > thead',
  TABLE_TBODY: '.tablecontainer > table.results-view > tbody',
  SCROLL_BAR: '.scroll-bar',
  COLUMNS_DROPDOWN: '.columns-dropdown',
} as const;

/** store マネージャーにバインドするキーのリスト */
const STORE_BINDINGS = [
  'searchStatus',
  'searchResults',
  'columns',
  'offset',
  'karyotype',
  'searchMessages',
] as const;

type ColumnResizeState = {
  columnId: string;
  startX: number;
  startWidth: number;
  nextColumns: ColumnConfig[];
};

const AUTO_SIZE_EXTRA_WIDTH = 4;

/**
 * 検索結果テーブルビューを管理するクラス
 * - 行の描画、スクロール、タッチ操作、列管理を統合制御
 * - store の変更を監視し、自動的に UI を更新
 */
export class ResultsView {
  /** ルート要素 */
  private elm: HTMLElement;
  /** タッチ操作ハンドラー */
  private touchHandler!: ResultsViewTouchHandler;
  /** スクロールバーコンポーネント */
  private scrollBar!: ResultsScrollBar;
  /** テーブルデータと描画管理 */
  private dataManager!: ResultsViewDataManager;
  /** テーブルヘッダー要素 */
  private thead!: HTMLElement;
  /** テーブルボディ要素 */
  private tbody!: HTMLElement;
  /** テーブルコンテナ要素 */
  private tablecontainer!: HTMLElement;
  /** 列管理ドロップダウンコンポーネント */
  private columnsDropdown!: ResultsColumnsDropdown;
  /** バインドされたキーボードイベントハンドラー */
  private _boundKeydownHandler!: (_e: KeyboardEvent) => void;
  /** バインドされたホイールイベントハンドラー */
  private _boundWheelHandler!: EventListener;
  /** ブラウザに応じたホイールイベント名 */
  private _wheelEventName = '';
  /** バインドされた検索モード変更ハンドラー */
  private _boundSearchModeHandler!: (_newMode: unknown) => void;
  /** 動的に作成した列表示制御用スタイル要素 */
  private _stylesheet!: HTMLStyleElement;
  private _resizeState: ColumnResizeState | null = null;
  private _boundColumnResizeStart!: (_e: PointerEvent) => void;
  private _boundColumnResizeMove!: (_e: PointerEvent) => void;
  private _boundColumnResizeEnd!: (_e: PointerEvent) => void;
  private _boundColumnResizeReset!: (_e: MouseEvent) => void;
  private _boundAutoSizeResultColumns!: (_event: Event) => void;
  private _autoSizedResultSignature = '';
  private _resizedColumnIds = new Set<string>();

  /**
   * ResultsView のコンストラクタ
   * - DOM 要素を初期化
   * - store バインドを設定
   * - 各コンポーネント（スクロールバー、タッチハンドラー、データマネージャー）を初期化
   * @param elm 検索結果表示用のルート要素
   */
  constructor(elm: HTMLElement) {
    this.elm = elm;

    // DOM 要素の取得
    const { status, messages, thead, tbody, tablecontainer, columnsDropdown } =
      this._getDOMElements();
    this.thead = thead;
    this.tbody = tbody;
    this.tablecontainer = tablecontainer;

    // Store マネージャーへのバインド（変更監視）
    this._connectToStoreManager();

    // UI コンポーネントの初期化
    this._configureScrollBar();
    this._initializeTableHeader(thead, storeManager.getData('columns'));
    this._stylesheet = this._createStylesheet();

    // イベントハンドラー・コンポーネントの初期化
    this._initializeComponentHandlers(status, messages, this._stylesheet);
    this.columnsDropdown = new ResultsColumnsDropdown(columnsDropdown);

    // 初期表示設定
    this._configureInitialState();

    // Search mode リスナー初期化
    this._initializeSearchModeListener();
  }

  // ========================================
  // Public Methods
  // ========================================

  /**
   * インスタンスをクリーンアップ
   * - 全スコープのイベントリスナー・バインディングを削除
   * - 子コンポーネント（ScrollBar、TouchHandler、DataManager、ColumnsDropdown）を破棄
   * - メモリリーク防止のため、ResultsView 削除時は必ず呼び出す
   */
  destroy(): void {
    // ScrollBar コンポーネントの破棄
    if (this.scrollBar) {
      this.scrollBar.destroy();
    }

    // Clean up TouchHandler component
    if (this.touchHandler) {
      this.touchHandler.destroy();
    }

    // Clean up DataManager component
    if (this.dataManager) {
      this.dataManager.destroy();
    }

    if (this.columnsDropdown) {
      this.columnsDropdown.destroy();
    }

    // Unbind all StoreManager event bindings
    STORE_BINDINGS.forEach((key) => {
      storeManager.unbind(key, this);
    });

    storeManager.unsubscribe('searchMode', this._boundSearchModeHandler);

    // Remove keydown event listener
    document.removeEventListener('keydown', this._boundKeydownHandler);

    if (this._wheelEventName && this._boundWheelHandler) {
      this.tbody.removeEventListener(
        this._wheelEventName,
        this._boundWheelHandler
      );
    }

    this.thead.removeEventListener('pointerdown', this._boundColumnResizeStart);
    this.thead.removeEventListener('dblclick', this._boundColumnResizeReset);
    document.removeEventListener('pointermove', this._boundColumnResizeMove);
    document.removeEventListener('pointerup', this._boundColumnResizeEnd);
    document.removeEventListener('pointercancel', this._boundColumnResizeEnd);
    this.tbody.removeEventListener('pointerdown', this._boundColumnResizeStart);
    window.removeEventListener(
      'togovar:results-rendered',
      this._boundAutoSizeResultColumns
    );

    if (this._stylesheet) {
      this._stylesheet.remove();
    }
  }

  /**
   * テーブルスクロール位置（オフセット）を更新
   * - store から呼ばれるコールバック
   * - DataManager に処理を委譲
   * @param offset 新しいオフセット値
   */
  offset(offset: number): void {
    this.dataManager.handleOffsetChange(offset);
  }

  /**
   * 検索メッセージを表示更新
   * - store から呼ばれるコールバック
   * - DataManager に処理を委譲
   * @param messages メッセージオブジェクト
   */
  searchMessages(messages: SearchMessages): void {
    this.dataManager.handleSearchMessages(messages);
  }

  /**
   * 検索ステータスを表示更新
   * - store から呼ばれるコールバック
   * - DataManager に処理を委譲
   * @param status ステータスオブジェクト
   */
  searchStatus(status: SearchStatus): void {
    this.dataManager.handleSearchStatus(status);
  }

  /**
   * 検索結果テーブルを描画更新
   * - store から呼ばれるコールバック
   * - DataManager に処理を委譲
   * - タッチデバイス判定を含める
   * @param _results 検索結果（_prefix は使用しないことを示す）
   */
  searchResults(_results: unknown): void {
    const results = storeManager.getData('searchResults');
    if (!Array.isArray(results) || results.length === 0) {
      this._autoSizedResultSignature = '';
    }

    this.dataManager.handleSearchResults(
      _results,
      isTouchDevice(),
      this.touchHandler.setElementsInteractable.bind(this.touchHandler)
    );
  }

  /**
   * テーブルヘッダー（列）を再構成
   * - store から呼ばれるコールバック
   * - 列の表示/非表示、順序変更に対応
   * - ヘッダーと本体の行セルを同期
   * @param columns 列設定配列
   */
  columns(columns: ColumnConfig[]): void {
    this._initializeTableHeader(this.thead, columns);
    this.dataManager.handleColumnsChange(columns);
    this.updateDisplaySize();
  }

  /**
   * テーブル表示サイズを更新（外部からの呼び出し用）
   * - ウィンドウリサイズ時など
   */
  updateDisplaySize(): void {
    this.dataManager.updateDisplaySize(
      isTouchDevice(),
      this.touchHandler.setElementsInteractable.bind(this.touchHandler)
    );
  }

  /**
   * 核型変更時の処理
   * - store から呼ばれるコールバック
   * - 表示サイズ再計算をトリガー
   * @param _karyotype 核型データ（_prefix は使用しないことを示す）
   */
  karyotype(_karyotype: unknown): void {
    this.updateDisplaySize();
  }

  // ========================================
  // Private Methods
  // ========================================

  /**
   * 必要な DOM 要素を取得
   * - ヘッダー・ステータス・メッセージ・テーブル・列ドロップダウン
   * @returns DOM 要素オブジェクト
   */
  private _getDOMElements() {
    const status = this.elm.querySelector(SELECTORS.STATUS) as HTMLElement;
    const messages = this.elm.querySelector(SELECTORS.MESSAGES) as HTMLElement;
    const thead = this.elm.querySelector(SELECTORS.TABLE_THEAD) as HTMLElement;
    const tbody = this.elm.querySelector(SELECTORS.TABLE_TBODY) as HTMLElement;
    const tablecontainer = this.elm.querySelector(
      SELECTORS.TABLE_CONTAINER
    ) as HTMLElement;
    const columnsDropdown = this.elm.querySelector(
      SELECTORS.COLUMNS_DROPDOWN
    ) as HTMLElement;

    return { status, messages, thead, tbody, tablecontainer, columnsDropdown };
  }

  /**
   * ストアマネージャーに接続
   * - 全ての store バインディングを設定
   * - キーボードイベントリスナーを登録
   */
  private _connectToStoreManager(): void {
    STORE_BINDINGS.forEach((key) => {
      storeManager.bind(key, this);
    });
    this._boundKeydownHandler = this._keydown.bind(this);
    document.addEventListener('keydown', this._boundKeydownHandler);
  }

  /**
   * スクロールバーコンポーネントを設定
   * - テーブルコンテナの直後に scroll-bar 要素を挿入
   * - ResultsScrollBar インスタンスを初期化
   */
  private _configureScrollBar(): void {
    this.elm
      .querySelector(SELECTORS.TABLE_CONTAINER)!
      .insertAdjacentHTML('afterend', '<div class="scroll-bar"></div>');
    this.scrollBar = new ResultsScrollBar(
      this.elm.querySelector(SELECTORS.SCROLL_BAR) as HTMLElement
    );
  }

  /**
   * テーブルヘッダーを描画
   * - store.columns を表示順に並べ替え
   * - 各列ごとに th 要素を生成
   * - tooltip ID を設定（アクセシビリティ対応）
   * @param thead テーブルヘッダー要素
   * @param columns 列設定配列
   */
  private _initializeTableHeader(
    thead: HTMLElement,
    columns: ColumnConfig[]
  ): void {
    const orderedColumns = getOrderedColumns(columns);
    const currentColumnIds = Array.from(thead.querySelectorAll('th')).map(
      (th) =>
        orderedColumns.find((column) => th.classList.contains(column.id))?.id
    );
    const nextColumnIds = orderedColumns.map((column) => column.id);
    const resizeBarCount = orderedColumns.filter(
      (column) => column.resizable !== false
    ).length;
    const hasResizeBars =
      thead.querySelectorAll('.resize-bar').length === resizeBarCount;

    if (
      hasResizeBars &&
      currentColumnIds.join(',') === nextColumnIds.join(',')
    ) {
      return;
    }

    thead.innerHTML = `<tr>${orderedColumns
      .map(
        (column) =>
          `<th class="${column.id}" data-column-id="${column.id}">` +
          `<span data-tooltip-id="table-header-${column.id}">${column.label}</span>` +
          (column.resizable === false
            ? ''
            : '<div class="resize-bar" aria-hidden="true"></div>') +
          '</th>'
      )
      .join('')}</tr>`;
  }

  /**
   * スタイルシートを作成
   * - 動的に生成される CSS を head に追加
   * @returns 作成されたスタイルシート要素
   */
  private _createStylesheet(): HTMLStyleElement {
    const stylesheet = document.createElement('style');
    document.getElementsByTagName('head')[0].appendChild(stylesheet);
    return stylesheet;
  }

  /**
   * コンポーネントハンドラーを初期化
   * - タッチイベント処理（ResultsViewTouchHandler）
   * - データ管理・行描画（ResultsViewDataManager）
   * - 各ハンドラーを store バインディングに登録
   * @param status ステータス表示要素
   * @param messages メッセージ表示要素
   * @param stylesheet 動的 CSS シートの参照
   */
  private _initializeComponentHandlers(
    status: HTMLElement,
    messages: HTMLElement,
    stylesheet: HTMLStyleElement
  ): void {
    this.touchHandler = new ResultsViewTouchHandler(
      this.elm,
      this.tbody,
      this.tablecontainer
    );
    this.dataManager = new ResultsViewDataManager(
      this.elm,
      status,
      messages,
      this.tbody,
      stylesheet
    );

    // イベントハンドラー設定
    this._configureEventHandlers();
  }

  /**
   * 初期表示状態を設定
   * - 列設定を DataManager に反映
   * - タッチデバイス判定で pointer-events を初期化
   */
  private _configureInitialState(): void {
    // DataManager に初期列設定を通知
    this.dataManager.handleColumnsChange(storeManager.getData('columns'));

    // PC では pointer-events を有効化、タッチデバイスは後で有効化
    this.touchHandler.setElementsInteractable(!isTouchDevice());
  }

  /**
   * ブラウザで利用可能なホイールイベント名を取得
   * - 標準：wheel
   * - IE/古いブラウザ：mousewheel
   * - Firefox 3.5 以前：DOMMouseScroll
   * @returns イベント名
   */
  private getWheelEventName(): string {
    return 'onwheel' in document
      ? 'wheel'
      : 'onmousewheel' in document
        ? 'mousewheel'
        : 'DOMMouseScroll';
  }

  /**
   * イベントハンドラーを設定
   * - ホイールスクロール処理（PC）
   * - タッチスクロール処理（モバイル）
   * - スクロールバーのコールバック設定
   */
  private _configureEventHandlers(): void {
    // PC 用ホイールイベント
    this._wheelEventName = this.getWheelEventName();
    this._boundWheelHandler = this._scroll.bind(this) as EventListener;
    this.tbody.addEventListener(this._wheelEventName, this._boundWheelHandler);
    this._boundColumnResizeStart = this._startColumnResize.bind(this);
    this._boundColumnResizeMove = this._moveColumnResize.bind(this);
    this._boundColumnResizeEnd = this._endColumnResize.bind(this);
    this._boundColumnResizeReset = this._resetColumnWidths.bind(this);
    this._boundAutoSizeResultColumns =
      this._autoSizeResultColumns.bind(this);
    this.thead.addEventListener('pointerdown', this._boundColumnResizeStart);
    this.tbody.addEventListener('pointerdown', this._boundColumnResizeStart);
    this.thead.addEventListener('dblclick', this._boundColumnResizeReset);
    document.addEventListener('pointermove', this._boundColumnResizeMove);
    document.addEventListener('pointerup', this._boundColumnResizeEnd);
    document.addEventListener('pointercancel', this._boundColumnResizeEnd);
    window.addEventListener(
      'togovar:results-rendered',
      this._boundAutoSizeResultColumns
    );

    // タッチハンドラーのスクロールコールバック設定
    this.touchHandler.setScrollCallbacks({
      onScrollStart: () => {
        this.scrollBar.setActive();
      },
      onScroll: (deltaY) => {
        const currentOffset = storeManager.getData('offset') || 0;
        this.scrollBar.handleScrollWithFeedback(deltaY, currentOffset);
      },
      onScrollEnd: () => {
        this.scrollBar.setInactive();
      },
    });
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

    this._resizedColumnIds.add(columnId);

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
    document.body.dataset.columnResizing = 'true';
  }

  private _moveColumnResize(e: PointerEvent): void {
    if (!this._resizeState) return;

    e.preventDefault();

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
    this.dataManager.handleColumnsChange(this._resizeState.nextColumns);
  }

  private _endColumnResize(): void {
    if (!this._resizeState) return;

    storeManager.setData('columns', this._resizeState.nextColumns);
    this._resizeState = null;
    delete document.body.dataset.columnResizing;
  }

  private _resetColumnWidths(e: MouseEvent): void {
    if (!(e.target as HTMLElement).closest('thead')) return;

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

  private _autoSizeResultColumns(event?: Event): void {
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
        return column;
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
      this.tbody.querySelectorAll<HTMLTableCellElement>(
        `td.${columnId}:not(:empty)`
      )
    ).filter((cell) => cell.offsetParent !== null);
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
    const table = document.createElement('table');
    const tbody = document.createElement('tbody');
    const row = document.createElement('tr');
    const measuringCell = cell.cloneNode(false) as HTMLTableCellElement;

    table.className = 'results-view';
    table.style.position = 'absolute';
    table.style.left = '-10000px';
    table.style.top = '0';
    table.style.visibility = 'hidden';
    table.style.width = 'auto';
    table.style.tableLayout = 'auto';
    table.style.pointerEvents = 'none';

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

    measuringCell
      .querySelectorAll<HTMLElement>('*')
      .forEach((element) => {
        element.style.maxWidth = 'none';
        element.style.overflow = 'visible';
        element.style.textOverflow = 'clip';
      });

    row.appendChild(measuringCell);
    tbody.appendChild(row);
    table.appendChild(tbody);
    document.body.appendChild(table);

    const width = measuringCell.getBoundingClientRect().width;
    table.remove();
    return width;
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
        range.detach();
        return 0;
      }

      range.setStartBefore(contentNodes[0]);
      range.setEndAfter(contentNodes[contentNodes.length - 1]);
    } else {
      range.selectNodeContents(content);
    }

    const width = range.getBoundingClientRect().width;
    range.detach();
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

  /**
   * ホイールスクロールイベント処理
   * - テーブルのスクロール位置を更新
   * - スクロールバーのビジュアルフィードバック
   * @param e ホイールイベント
   */
  private _scroll(e: WheelEvent): void {
    e.stopPropagation();
    // 垂直スクロール以外は処理しない
    if (e.deltaY === 0) return;

    this.scrollBar.handleScroll(e.deltaY);
  }

  /**
   * キーボード入力処理
   * - 矢印キー（上下）：行選択の移動
   * - Escape：選択解除
   * @param e キーボードイベント
   */
  private _keydown(e: KeyboardEvent): void {
    if (storeManager.getData('selectedRow') === undefined) return;

    if (keyDownEvent('selectedRow')) {
      switch (e.key) {
        case 'ArrowUp': // ↑ キー
          this.dataManager.shiftSelectedRow(-1);
          break;
        case 'ArrowDown': // ↓ キー
          this.dataManager.shiftSelectedRow(1);
          break;
        case 'Escape': // 選択を解除
          storeManager.setData('selectedRow', undefined);
          break;
      }
    }
  }

  /**
   * 検索モード変更リスナーを初期化
   * - 検索モード切り替え時にスクロール位置をリセット
   */
  private _initializeSearchModeListener(): void {
    this._boundSearchModeHandler = (_newMode) => {
      // 検索モード変更時にスクロール位置をリセット
      this.scrollBar.resetScrollPosition();
    };
    storeManager.subscribe('searchMode', this._boundSearchModeHandler);
  }
}
