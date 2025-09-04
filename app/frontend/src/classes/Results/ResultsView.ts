import { storeManager } from '../../store/StoreManager';
import { COLUMNS } from '../../global.js';
import { ResultsScrollBar } from './ResultsScrollBar';
import { keyDownEvent } from '../../utils/keyDownEvent.js';
import { ResultsViewTouchHandler } from './ResultsViewTouchHandler';
import { ResultsViewDataManager } from './ResultsViewDataManager';
import { SearchMessages, SearchStatus, ColumnConfig } from '../../types';

/**
 * 検索結果テーブルビューを管理するクラス
 * スクロール機能、タッチ操作、行の表示管理を行う
 */
export class ResultsView {
  /** DOMセレクタ定数 */
  private static readonly SELECTORS = {
    STATUS: 'header.header > .left > .status',
    MESSAGES: '#Messages',
    TABLE_CONTAINER: '.tablecontainer',
    TABLE_THEAD: '.tablecontainer > table.results-view > thead',
    TABLE_TBODY: '.tablecontainer > table.results-view > tbody',
    SCROLL_BAR: '.scroll-bar',
  } as const;

  /** ストアマネージャーのバインドキー */
  private static readonly STORE_BINDINGS = [
    'searchStatus',
    'searchResults',
    'columns',
    'offset',
    'karyotype',
    'searchMessages',
  ] as const;

  /** ルート要素 */
  private elm: HTMLElement;
  /** タッチハンドラー */
  private touchHandler: ResultsViewTouchHandler;
  /** スクロールバー */
  private scrollBar: ResultsScrollBar;
  /** データマネージャー */
  private dataManager: ResultsViewDataManager;
  /** テーブルボディ要素 */
  private tbody: HTMLElement;
  /** テーブルコンテナ要素 */
  private tablecontainer: HTMLElement;

  /**
   * ResultsViewのコンストラクタ
   * @param elm - 結果表示用のルート要素
   */
  constructor(elm: HTMLElement) {
    this.elm = elm;

    // DOM要素の取得
    const { status, messages, thead, tbody, tablecontainer } =
      this._getDOMElements();
    this.tbody = tbody;
    this.tablecontainer = tablecontainer;

    // ストアマネージャーのバインド
    this._connectToStoreManager();

    // UI要素の初期化
    this._configureScrollBar();
    this._initializeTableHeader(thead);
    const stylesheet = this._createStylesheet();

    // ハンドラーの初期化
    this._initializeComponentHandlers(status, messages, stylesheet);

    // 初期設定
    this._configureInitialState();
  }

  // ========================================
  // Public Methods
  // ========================================

  /**
   * オフセットの変更時の処理
   * @param offset - 新しいオフセット値
   */
  offset(offset: number): void {
    this.dataManager.handleOffsetChange(offset);
  }

  /**
   * 検索メッセージの表示
   * @param messages - メッセージオブジェクト
   */
  searchMessages(messages: SearchMessages): void {
    this.dataManager.handleSearchMessages(messages);
  }

  /**
   * 検索ステータスの表示
   * @param status - ステータスオブジェクト
   */
  searchStatus(status: SearchStatus): void {
    this.dataManager.handleSearchStatus(status);
  }

  /**
   * 検索結果の表示
   * @param _results - 検索結果（未使用）
   */
  searchResults(_results: any): void {
    this.dataManager.handleSearchResults(
      _results,
      this.touchHandler.isTouchEnabled,
      this.touchHandler.setTouchElementsPointerEvents.bind(this.touchHandler)
    );
  }

  /**
   * カラムの表示／非表示を制御する
   * @param columns - カラム設定の配列
   */
  columns(columns: ColumnConfig[]): void {
    this.dataManager.handleColumnsChange(columns);
  }

  /**
   * 表示サイズを更新する（外部からの呼び出し用）
   */
  updateDisplaySize(): void {
    this.dataManager.updateDisplaySize(
      this.touchHandler.isTouchEnabled,
      this.touchHandler.setTouchElementsPointerEvents.bind(this.touchHandler)
    );
  }

  /**
   * 核型の変更時の処理
   * @param _karyotype - 核型データ（未使用）
   */
  karyotype(_karyotype: any): void {
    this.updateDisplaySize();
  }

  // ========================================
  // Private Methods
  // ========================================

  /**
   * DOM要素を取得する
   */
  private _getDOMElements() {
    const status = this.elm.querySelector(
      ResultsView.SELECTORS.STATUS
    ) as HTMLElement;
    const messages = this.elm.querySelector(
      ResultsView.SELECTORS.MESSAGES
    ) as HTMLElement;
    const thead = this.elm.querySelector(
      ResultsView.SELECTORS.TABLE_THEAD
    ) as HTMLElement;
    const tbody = this.elm.querySelector(
      ResultsView.SELECTORS.TABLE_TBODY
    ) as HTMLElement;
    const tablecontainer = this.elm.querySelector(
      ResultsView.SELECTORS.TABLE_CONTAINER
    ) as HTMLElement;

    return { status, messages, thead, tbody, tablecontainer };
  }

  /**
   * ストアマネージャーに接続する
   * データバインディングとキーボードイベントリスナーを設定
   */
  private _connectToStoreManager(): void {
    ResultsView.STORE_BINDINGS.forEach((key) => {
      storeManager.bind(key, this);
    });
    document.addEventListener('keydown', this._keydown.bind(this));
  }

  /**
   * スクロールバーを設定する
   * ホイールイベントの検出とスクロールバーの初期状態を構成
   */
  private _configureScrollBar(): void {
    this.elm
      .querySelector(ResultsView.SELECTORS.TABLE_CONTAINER)!
      .insertAdjacentHTML('afterend', '<div class="scroll-bar"></div>');
    this.scrollBar = new ResultsScrollBar(
      this.elm.querySelector(ResultsView.SELECTORS.SCROLL_BAR) as HTMLElement
    );
  }

  /**
   * テーブルヘッダーを初期化する
   */
  private _initializeTableHeader(thead: HTMLElement): void {
    thead.innerHTML = `<tr>${COLUMNS.map(
      (column) =>
        `<th class="${column.id}"><p data-tooltip-id="table-header-${column.id}">${column.label}</p></th>`
    ).join('')}</tr>`;
  }

  /**
   * スタイルシートを作成する
   */
  private _createStylesheet(): HTMLStyleElement {
    const stylesheet = document.createElement('style');
    document.getElementsByTagName('head')[0].appendChild(stylesheet);
    return stylesheet;
  }

  /**
   * コンポーネントハンドラーを初期化する
   * タッチ、スクロール、データ管理の各ハンドラーを作成し、イベントを設定
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

    // コールバック設定
    this._configureEventHandlers();
  }

  /**
   * 初期状態を設定する
   * カラム設定、スクロール位置、タッチイベントの初期化
   */
  private _configureInitialState(): void {
    // 初期化
    this.dataManager.handleColumnsChange(storeManager.getData('columns'));

    // 初期状態のpointer-events設定
    this.touchHandler.setTouchElementsPointerEvents(
      !this.touchHandler.isTouchEnabled
    );
  }

  /**
   * ホイールイベント名を取得する
   */
  private getWheelEventName(): string {
    return 'onwheel' in document
      ? 'wheel'
      : 'onmousewheel' in document
      ? 'mousewheel'
      : 'DOMMouseScroll';
  }

  /**
   * イベントハンドラーを設定する
   */
  private _configureEventHandlers(): void {
    // PC用のホイールイベント
    this.tbody.addEventListener(
      this.getWheelEventName(),
      this._scroll.bind(this)
    );

    // タッチハンドラーのコールバック設定
    this.touchHandler.setScrollCallbacks({
      onScrollStart: () => {
        this.scrollBar.setActive();
      },
      onScroll: (deltaY, startOffset) => {
        this.scrollBar.handleScrollWithFeedback(deltaY, startOffset);
      },
      onScrollEnd: () => {
        this.scrollBar.setInactive();
      },
    });
  }

  /**
   * スクロールイベントハンドラ
   * @param e - ホイールイベント
   */
  private _scroll(e: WheelEvent): void {
    e.stopPropagation();
    // 縦方向にスクロールしていない場合スルー
    if (e.deltaY === 0) return;

    this.scrollBar.handleScroll(e.deltaY);
  }

  /**
   * キーダウンイベントハンドラ
   * @param e - キーボードイベント
   */
  private _keydown(e: KeyboardEvent): void {
    if (storeManager.getData('selectedRow') === undefined) return;

    if (keyDownEvent('selectedRow')) {
      switch (e.key) {
        case 'ArrowUp': // ↑
          this.dataManager.shiftSelectedRow(-1);
          break;
        case 'ArrowDown': // ↓
          this.dataManager.shiftSelectedRow(1);
          break;
        case 'Escape': // 選択解除
          storeManager.setData('selectedRow', undefined);
          break;
      }
    }
  }
}
