import { storeManager } from '../../store/StoreManager';
import { getOrderedColumns } from '../../columns';
import { TR_HEIGHT } from '../../global';
import { ResultsScrollBar } from './ResultsScrollBar';
import { ResultsColumnsDropdown } from './ResultsColumnsDropdown';
import { keyDownEvent } from '../../utils/keyDownEvent';
import { ResultsViewTouchHandler } from './ResultsViewTouchHandler';
import { ResultsViewDataManager } from './ResultsViewDataManager';
import { ResultsColumnAutoSizer } from './ResultsColumnAutoSizer';
import { ResultsColumnResizeController } from './ResultsColumnResizeController';
import type { SearchMessages, SearchStatus, ColumnConfig } from '../../types';
import type { StoreState } from '../../types/storeState';
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

/**
 * 検索結果テーブルビューを管理するクラス。
 * 行の描画・スクロール・タッチ操作・列管理を統合制御し、
 * Store の変更を監視して自動的に UI を更新する。
 */
export class ResultsView {
  private elm: HTMLElement;
  private touchHandler!: ResultsViewTouchHandler;
  private scrollBar!: ResultsScrollBar;
  private dataManager!: ResultsViewDataManager;
  private thead!: HTMLElement;
  private tbody!: HTMLElement;
  private tablecontainer!: HTMLElement;
  private columnsDropdown!: ResultsColumnsDropdown;
  private columnAutoSizer!: ResultsColumnAutoSizer;
  private columnResizeController!: ResultsColumnResizeController;
  private stylesheet!: HTMLStyleElement;

  private boundKeydownHandler!: (_e: KeyboardEvent) => void;
  private boundWheelHandler!: EventListener;
  private boundSearchModeHandler!: (_newMode: unknown) => void;
  private boundResizeFallbackHandler: (() => void) | null = null;
  private wheelEventName = '';
  private resizeObserver: ResizeObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private resizeFrameId: number | null = null;

  // unsubscribe で同一参照が必要なため、束縛済みコールバックをフィールドに保持する
  private onSearchStatus = (v: StoreState['searchStatus']) => { if (v) this.searchStatus(v); };
  private onSearchResults = (v: StoreState['searchResults']) => this.searchResults(v);
  private onColumns = (v: StoreState['columns']) => this.columns(v);
  private onOffset = (v: StoreState['offset']) => this.offset(v);
  private onKaryotype = (v: StoreState['karyotype']) => this.karyotype(v);
  private onSearchMessages = (v: StoreState['searchMessages']) => this.searchMessages(v ?? {});

  constructor(elm: HTMLElement) {
    this.elm = elm;

    const { status, messages, thead, tbody, tablecontainer, columnsDropdown } =
      this.getDOMElements();
    this.thead = thead;
    this.tbody = tbody;
    this.tablecontainer = tablecontainer;

    this.connectToStoreManager();
    this.configureScrollBar();
    this.initializeTableHeader(thead, storeManager.getData('columns'));
    this.stylesheet = this.createStylesheet();

    this.initializeComponentHandlers(status, messages, this.stylesheet);
    this.columnsDropdown = new ResultsColumnsDropdown(columnsDropdown);

    this.configureInitialState();
    this.initializeSearchModeListener();
    this.observeDisplaySize();
  }

  // ================================================================
  // Public Methods
  // ================================================================

  /** 全イベントリスナーと子コンポーネントを破棄してメモリリークを防ぐ。 */
  destroy(): void {
    this.scrollBar?.destroy();
    this.touchHandler?.destroy();
    this.dataManager?.destroy();
    this.columnsDropdown?.destroy();
    this.columnResizeController?.destroy();
    this.columnAutoSizer?.destroy();

    storeManager.unsubscribe('searchStatus', this.onSearchStatus);
    storeManager.unsubscribe('searchResults', this.onSearchResults);
    storeManager.unsubscribe('columns', this.onColumns);
    storeManager.unsubscribe('offset', this.onOffset);
    storeManager.unsubscribe('karyotype', this.onKaryotype);
    storeManager.unsubscribe('searchMessages', this.onSearchMessages);
    storeManager.unsubscribe('searchMode', this.boundSearchModeHandler);

    document.removeEventListener('keydown', this.boundKeydownHandler);

    if (this.wheelEventName && this.boundWheelHandler) {
      this.tbody.removeEventListener(this.wheelEventName, this.boundWheelHandler);
    }

    this.stylesheet?.remove();

    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
    if (this.boundResizeFallbackHandler) {
      window.removeEventListener('resize', this.boundResizeFallbackHandler);
    }
    if (this.resizeFrameId !== null) {
      cancelAnimationFrame(this.resizeFrameId);
    }
    this.resizeObserver = null;
    this.mutationObserver = null;
    this.resizeFrameId = null;
    this.boundResizeFallbackHandler = null;
  }

  /** Store の offset 変化を受けて DataManager へ委譲する。 */
  offset(offset: number): void {
    this.dataManager.handleOffsetChange(
      offset,
      isTouchDevice(),
      this.touchHandler.setElementsInteractable.bind(this.touchHandler)
    );
  }

  /** Store の searchMessages 変化を受けて DataManager へ委譲する。 */
  searchMessages(messages: SearchMessages): void {
    this.dataManager.handleSearchMessages(messages);
  }

  /** Store の searchStatus 変化を受けて DataManager へ委譲する。 */
  searchStatus(status: SearchStatus): void {
    this.dataManager.handleSearchStatus(status);
  }

  /** Store の searchResults 変化を受けてテーブル行を再描画する。 */
  searchResults(results: unknown): void {
    if (!Array.isArray(results) || results.length === 0) {
      this.columnAutoSizer.resetSignature();
    }
    this.dataManager.handleSearchResults(
      results,
      isTouchDevice(),
      this.touchHandler.setElementsInteractable.bind(this.touchHandler)
    );
  }

  /** Store の columns 変化を受けてヘッダーを再構築し表示サイズを再計算する。 */
  columns(columns: ColumnConfig[]): void {
    this.initializeTableHeader(this.thead, columns);
    this.dataManager.handleColumnsChange(columns);
    this.updateDisplaySize();
  }

  /** 表示サイズを再計算する（ウィンドウリサイズなど外部からの呼び出し用）。 */
  updateDisplaySize(): void {
    this.dataManager.updateDisplaySize(
      isTouchDevice(),
      this.touchHandler.setElementsInteractable.bind(this.touchHandler)
    );
  }

  /** Store の karyotype 変化を受けて表示サイズを再計算する。 */
  karyotype(_karyotype: unknown): void {
    this.updateDisplaySize();
  }

  // ================================================================
  // Private Methods
  // ================================================================

  /** 必要な DOM 要素をまとめて取得する。 */
  private getDOMElements() {
    return {
      status: this.elm.querySelector(SELECTORS.STATUS) as HTMLElement,
      messages: this.elm.querySelector(SELECTORS.MESSAGES) as HTMLElement,
      thead: this.elm.querySelector(SELECTORS.TABLE_THEAD) as HTMLElement,
      tbody: this.elm.querySelector(SELECTORS.TABLE_TBODY) as HTMLElement,
      tablecontainer: this.elm.querySelector(SELECTORS.TABLE_CONTAINER) as HTMLElement,
      columnsDropdown: this.elm.querySelector(SELECTORS.COLUMNS_DROPDOWN) as HTMLElement,
    };
  }

  /** Store へ購読登録してキーボードイベントリスナーを設定する。 */
  private connectToStoreManager(): void {
    storeManager.subscribe('searchStatus', this.onSearchStatus);
    storeManager.subscribe('searchResults', this.onSearchResults);
    storeManager.subscribe('columns', this.onColumns);
    storeManager.subscribe('offset', this.onOffset);
    storeManager.subscribe('karyotype', this.onKaryotype);
    storeManager.subscribe('searchMessages', this.onSearchMessages);
    this.boundKeydownHandler = this.keydown.bind(this);
    document.addEventListener('keydown', this.boundKeydownHandler);
  }

  /** テーブルコンテナの直後に scroll-bar 要素を挿入して ResultsScrollBar を初期化する。 */
  private configureScrollBar(): void {
    this.elm
      .querySelector(SELECTORS.TABLE_CONTAINER)!
      .insertAdjacentHTML('afterend', '<div class="scroll-bar"></div>');
    this.scrollBar = new ResultsScrollBar(
      this.elm.querySelector(SELECTORS.SCROLL_BAR) as HTMLElement
    );
  }

  /**
   * テーブルヘッダーを描画する。
   * 列の順序・リサイズバーの有無が変わっていない場合は再描画をスキップする。
   */
  private initializeTableHeader(thead: HTMLElement, columns: ColumnConfig[]): void {
    const orderedColumns = getOrderedColumns(columns);
    const currentColumnIds = Array.from(thead.querySelectorAll('th')).map(
      (th) => orderedColumns.find((col) => th.classList.contains(col.id))?.id
    );
    const nextColumnIds = orderedColumns.map((col) => col.id);
    const resizeBarCount = orderedColumns.filter((col) => col.resizable !== false).length;
    const hasResizeBars = thead.querySelectorAll('.resize-bar').length === resizeBarCount;

    if (hasResizeBars && currentColumnIds.join(',') === nextColumnIds.join(',')) return;

    thead.innerHTML = `<tr>${orderedColumns
      .map(
        (col) =>
          `<th class="${col.id}" data-column-id="${col.id}">` +
          `<span data-tooltip-id="table-header-${col.id}">${col.label}</span>` +
          (col.resizable === false ? '' : '<div class="resize-bar" aria-hidden="true"></div>') +
          '</th>'
      )
      .join('')}</tr>`;
  }

  /** 列表示制御用のスタイル要素を head に追加して返す。 */
  private createStylesheet(): HTMLStyleElement {
    const stylesheet = document.createElement('style');
    document.getElementsByTagName('head')[0].appendChild(stylesheet);
    return stylesheet;
  }

  /** タッチハンドラー・DataManager を初期化してイベントを設定する。 */
  private initializeComponentHandlers(
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
    this.configureEventHandlers();
  }

  /** DataManager に初期列設定を通知し、デバイス種別に応じて pointer-events を設定する。 */
  private configureInitialState(): void {
    this.dataManager.handleColumnsChange(storeManager.getData('columns'));
    this.touchHandler.setElementsInteractable(!isTouchDevice());
  }

  /**
   * ブラウザで利用可能なホイールイベント名を返す。
   * 標準は 'wheel'、古い IE/Firefox は 'mousewheel'/'DOMMouseScroll'。
   */
  private getWheelEventName(): string {
    return 'onwheel' in document
      ? 'wheel'
      : 'onmousewheel' in document
        ? 'mousewheel'
        : 'DOMMouseScroll';
  }

  /** ホイール・タッチ・列リサイズの各イベントハンドラーを設定する。 */
  private configureEventHandlers(): void {
    this.wheelEventName = this.getWheelEventName();
    this.boundWheelHandler = this.scroll.bind(this) as EventListener;
    this.tbody.addEventListener(this.wheelEventName, this.boundWheelHandler);

    this.columnAutoSizer = new ResultsColumnAutoSizer(this.tbody);
    this.columnResizeController = new ResultsColumnResizeController({
      thead: this.thead,
      tbody: this.tbody,
      tablecontainer: this.tablecontainer,
      autoSizer: this.columnAutoSizer,
      previewColumns: (columns) => this.dataManager.handleColumnsChange(columns),
    });

    // タッチ開始時の offset を固定することで、スワイプ中の誤差積み上がりを防ぐ
    let touchStartOffset = 0;
    this.touchHandler.setScrollCallbacks({
      onScrollStart: () => {
        touchStartOffset = storeManager.getData('offset') || 0;
        this.scrollBar.setActive();
      },
      onScroll: (deltaY) => {
        this.scrollBar.handleScrollWithFeedback(deltaY, touchStartOffset);
      },
      onScrollEnd: () => {
        this.scrollBar.setInactive();
      },
    });
  }

  /**
   * ホイールスクロールを処理する。
   * deltaMode を正規化して Firefox（ライン単位）やページ単位にも対応する。
   */
  private scroll(e: WheelEvent): void {
    e.stopPropagation();
    if (e.deltaY === 0) return;

    let delta = e.deltaY;
    if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) {
      delta = e.deltaY * TR_HEIGHT;
    } else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      delta = e.deltaY * storeManager.getData('rowCount') * TR_HEIGHT;
    }

    this.scrollBar.handleScroll(delta);
  }

  /** 矢印キーで行選択を移動し、Escape で選択解除する。 */
  private keydown(e: KeyboardEvent): void {
    if (storeManager.getData('selectedRow') === undefined) return;
    if (!keyDownEvent('selectedRow')) return;

    switch (e.key) {
      case 'ArrowUp':
        this.dataManager.shiftSelectedRow(-1);
        break;
      case 'ArrowDown':
        this.dataManager.shiftSelectedRow(1);
        break;
      case 'Escape':
        storeManager.setData('selectedRow', undefined);
        break;
    }
  }

  /** 検索モード切り替え時にスクロール位置をリセットするリスナーを登録する。 */
  private initializeSearchModeListener(): void {
    this.boundSearchModeHandler = () => this.scrollBar.resetScrollPosition();
    storeManager.subscribe('searchMode', this.boundSearchModeHandler);
  }

  /**
   * ResultsView の高さは CSS flex で決まるため、
   * 自身の実寸変化を監視して仮想行数だけを JS で再計算する。
   */
  private observeDisplaySize(): void {
    if (typeof ResizeObserver === 'undefined') {
      this.boundResizeFallbackHandler = () => this.scheduleDisplaySizeUpdate();
      window.addEventListener('resize', this.boundResizeFallbackHandler);
      // タブ切替・Drawer 開閉など window.resize では検出できないレイアウト変化にも対応する
      this.mutationObserver = new MutationObserver(() => this.scheduleDisplaySizeUpdate());
      this.mutationObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class', 'data-search-mode'],
      });
      return;
    }

    this.resizeObserver = new ResizeObserver(() => this.scheduleDisplaySizeUpdate());
    this.resizeObserver.observe(this.elm);
  }

  /** ResizeObserver の連続発火をまとめ、行数再計算を次フレームに遅延する。 */
  private scheduleDisplaySizeUpdate(): void {
    if (this.resizeFrameId !== null) return;
    this.resizeFrameId = requestAnimationFrame(() => {
      this.resizeFrameId = null;
      this.updateDisplaySize();
    });
  }
}
