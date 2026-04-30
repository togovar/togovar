import { storeManager } from '../../store/StoreManager';
import { getOrderedColumns } from '../../global';
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
    const stylesheet = this._createStylesheet();

    // イベントハンドラー・コンポーネントの初期化
    this._initializeComponentHandlers(status, messages, stylesheet);
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
   * - store.columns から表示対象の列のみを抽出
   * - 各列ごとに th 要素を生成
   * - tooltip ID を設定（アクセシビリティ対応）
   * @param thead テーブルヘッダー要素
   * @param columns 列設定配列
   */
  private _initializeTableHeader(
    thead: HTMLElement,
    columns: ColumnConfig[]
  ): void {
    thead.innerHTML = `<tr>${getOrderedColumns(columns)
      .map(
      (column) =>
        `<th class="${column.id}"><p data-tooltip-id="table-header-${column.id}">${column.label}</p></th>`
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
