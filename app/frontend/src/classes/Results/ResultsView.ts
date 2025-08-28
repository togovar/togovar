import { storeManager } from '../../store/StoreManager';
import { ResultsRowView } from './ResultsRowView';
import ScrollBar from './../ScrollBar.js';
import { TR_HEIGHT, COMMON_FOOTER_HEIGHT, COLUMNS } from '../../global.js';
import { keyDownEvent } from '../../utils/keyDownEvent.js';
import { ResultsViewTouchHandler } from './ResultsViewTouchHandler';
import { ResultsViewScrollHandler } from './ResultsViewScrollHandler';
import { ResultsViewDataManager } from './ResultsViewDataManager';

/**
 * 検索結果テーブルビューを管理するクラス
 * スクロール機能、タッチ操作、行の表示管理を行う
 */
export class ResultsView {
  /** ルート要素 */
  private elm: HTMLElement;
  /** タッチハンドラー */
  private touchHandler: ResultsViewTouchHandler;
  /** スクロールハンドラー */
  private scrollHandler: ResultsViewScrollHandler;
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

    const status = this.elm.querySelector(
      'header.header > .left > .status'
    ) as HTMLElement;
    const messages = this.elm.querySelector('#Messages') as HTMLElement;

    // ストアマネージャーのバインド
    storeManager.bind('searchStatus', this);
    storeManager.bind('searchResults', this);
    storeManager.bind('columns', this);
    storeManager.bind('offset', this);
    storeManager.bind('karyotype', this);
    storeManager.bind('searchMessages', this);
    document.addEventListener('keydown', this.keydown.bind(this));

    // スクロールバーの生成
    this.elm
      .querySelector('.tablecontainer')!
      .insertAdjacentHTML('afterend', '<div class="scroll-bar"></div>');
    new ScrollBar(this.elm.querySelector('.scroll-bar') as HTMLElement);

    // ヘッダ+ ヘッダのツールチップ用のデータ設定
    const thead = this.elm.querySelector(
      '.tablecontainer > table.results-view > thead'
    ) as HTMLElement;
    thead.innerHTML = `<tr>${COLUMNS.map(
      (column) =>
        `<th class="${column.id}"><p data-tooltip-id="table-header-${column.id}">${column.label}</p></th>`
    ).join('')}</tr>`;

    this.tbody = this.elm.querySelector(
      '.tablecontainer > table.results-view > tbody'
    ) as HTMLElement;

    this.tablecontainer = this.elm.querySelector(
      '.tablecontainer'
    ) as HTMLElement;

    // カラムの表示を制御するためのスタイルシート
    const stylesheet = document.createElement('style');
    stylesheet.type = 'text/css';
    document.getElementsByTagName('head')[0].appendChild(stylesheet);

    // ハンドラーの初期化
    this.touchHandler = new ResultsViewTouchHandler(
      this.elm,
      this.tbody,
      this.tablecontainer
    );
    this.scrollHandler = new ResultsViewScrollHandler(this.elm);
    this.dataManager = new ResultsViewDataManager(
      this.elm,
      status,
      messages,
      this.tbody,
      stylesheet
    );

    // コールバック設定
    this.setupEventHandlers();

    // 初期化
    this.dataManager.handleColumnsChange(storeManager.getData('columns'));
    this.scrollHandler.updateLastScrollFromOffset();

    // 初期状態のpointer-events設定
    if (this.touchHandler.isTouchEnabled) {
      // タッチデバイスでは初期状態をnoneに設定
      this.touchHandler.setTouchElementsPointerEvents(false);
    } else {
      // 非タッチデバイスではpointer-eventsを有効化
      this.touchHandler.setTouchElementsPointerEvents(true);
    }
  }

  /**
   * イベントハンドラーを設定する
   */
  private setupEventHandlers(): void {
    // PC用のホイールイベント
    const mousewheelevent =
      'onwheel' in document
        ? 'wheel'
        : 'onmousewheel' in document
        ? 'mousewheel'
        : 'DOMMouseScroll';
    this.tbody.addEventListener(mousewheelevent, this.scroll.bind(this));

    // タッチハンドラーのコールバック設定
    this.touchHandler.setScrollCallbacks({
      onScrollStart: () => {
        this.scrollHandler.initializeScrollBarPosition();
      },
      onScroll: (deltaY) => {
        const offset = storeManager.getData('offset') || 0;
        this.touchHandler.setTouchStartOffset(offset);
        this.scrollHandler.handleScrollWithScrollBarFeedback(deltaY, offset);
      },
      onScrollEnd: () => {
        this.scrollHandler.deactivateScrollBar();
      },
    });
  }

  /**
   * スクロールイベントハンドラ
   * @param e - ホイールイベント
   */
  private scroll(e: WheelEvent): void {
    e.stopPropagation();
    // 縦方向にスクロールしていない場合スルー
    if (e.deltaY === 0) return;
    this.scrollHandler.handleScroll(e.deltaY);
  }

  /**
   * オフセットの変更時の処理
   * @param offset - 新しいオフセット値
   */
  offset(offset: number): void {
    this.scrollHandler.lastScrollPosition = offset * TR_HEIGHT;
    this.dataManager.handleOffsetChange(offset);
  }

  /**
   * 検索メッセージの表示
   * @param messages - メッセージオブジェクト
   */
  searchMessages(messages: {
    notice?: string;
    warning?: string;
    error?: string;
  }): void {
    this.dataManager.handleSearchMessages(messages);
  }

  /**
   * 検索ステータスの表示
   * @param status - ステータスオブジェクト
   */
  searchStatus(status: { available: number; filtered: number }): void {
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
  columns(columns: Array<{ id: string; isUsed: boolean }>): void {
    this.dataManager.handleColumnsChange(columns);
  }

  /**
   * キーダウンイベントハンドラ
   * @param e - キーボードイベント
   */
  private keydown(e: KeyboardEvent): void {
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
}
