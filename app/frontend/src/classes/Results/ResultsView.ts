import { storeManager } from '../../store/StoreManager';
import { ResultsRowView } from './ResultsRowView';
import ScrollBar from './../ScrollBar.js';
import { TR_HEIGHT, COMMON_FOOTER_HEIGHT, COLUMNS } from '../../global.js';
import { keyDownEvent } from '../../utils/keyDownEvent.js';

/**
 * 検索結果テーブルビューを管理するクラス
 * スクロール機能、タッチ操作、行の表示管理を行う
 */
export class ResultsView {
  /** スクロール感度の調整 */
  static readonly SCROLL_SENSITIVITY: number = 0.1;
  /** スクロール判定の閾値（ピクセル） */
  static readonly SCROLL_THRESHOLD: number = 10;
  /** タップ判定の閾値（ミリ秒） */
  static readonly TAP_THRESHOLD: number = 300;

  /** ルート要素 */
  private elm: HTMLElement;
  /** 結果行のビューインスタンス配列 */
  private rows: ResultsRowView[] = [];
  /** 最後のスクロール位置 */
  private lastScroll: number = 0;
  /** ステータス表示要素 */
  private status: HTMLElement;
  /** メッセージ表示要素 */
  private messages: HTMLElement;
  /** テーブルボディ要素 */
  private tbody: HTMLElement;
  /** テーブルコンテナ要素 */
  private tablecontainer: HTMLElement;
  /** カラム表示制御用スタイルシート */
  private stylesheet: HTMLStyleElement;

  // タッチスクロール用変数
  /** タッチ開始Y座標 */
  private touchStartY: number = 0;
  /** タッチ開始X座標 */
  private touchStartX: number = 0;
  /** タッチ開始時刻 */
  private touchStartTime: number = 0;
  /** 最後のタッチY座標 */
  private touchLastY: number = 0;
  /** 最後のタッチX座標 */
  private touchLastX: number = 0;
  /** スクロール中フラグ */
  private isScrolling: boolean = false;
  /** 最後のタッチ時刻 */
  private lastTouchTime: number = 0;

  // タッチ検出用変数
  /** タッチ移動距離 */
  private touchDistance: number = 0;
  /** タッチ継続時間 */
  private touchDuration: number = 0;
  /** タッチデバイス判定フラグ */
  private isTouchDevice: boolean = false;
  /** タッチ開始時のオフセット */
  private touchStartOffset: number = 0;

  /**
   * ResultsViewのコンストラクタ
   * @param elm - 結果表示用のルート要素
   */
  constructor(elm: HTMLElement) {
    this.elm = elm;
    this.status = this.elm.querySelector(
      'header.header > .left > .status'
    ) as HTMLElement;
    this.messages = this.elm.querySelector('#Messages') as HTMLElement;

    // ストアマネージャーのバインド
    storeManager.bind('searchStatus', this);
    storeManager.bind('searchResults', this);
    storeManager.bind('columns', this);
    storeManager.bind('offset', this);
    storeManager.bind('karyotype', this);
    storeManager.bind('searchMessages', this);
    document.addEventListener('keydown', this.keydown.bind(this));

    // タッチデバイス検出
    this.detectTouchDevice();

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

    // スクロール制御
    this.setupScrollEvents();

    // カラムの表示を制御するためのスタイルシート
    this.stylesheet = document.createElement('style');
    this.stylesheet.type = 'text/css';
    document.getElementsByTagName('head')[0].appendChild(this.stylesheet);
    this.columns(storeManager.getData('columns'));

    // this.lastScrollを初期化
    this.updateLastScrollFromOffset();

    // 初期状態のpointer-events設定
    if (this.isTouchDevice) {
      // タッチデバイスでは初期状態をnoneに設定
      this.setTouchElementsPointerEvents(false);
    } else {
      // 非タッチデバイスではpointer-eventsを有効化
      this.setTouchElementsPointerEvents(true);
    }
  }

  /**
   * タッチデバイスを検出する
   */
  private detectTouchDevice(): void {
    this.isTouchDevice =
      'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * タッチ要素のpointer-eventsを制御する
   * @param enabled - pointer-eventsを有効にするかどうか
   */
  private setTouchElementsPointerEvents(enabled: boolean): void {
    const touchElements = this.elm.querySelectorAll(
      '.tablecontainer > table > tbody > tr, .tablecontainer > table > tbody > td, .tablecontainer > table > tbody > td *'
    ) as NodeListOf<HTMLElement>;

    touchElements.forEach((element) => {
      if (enabled) {
        element.style.pointerEvents = 'auto';
      } else {
        element.style.pointerEvents = 'none';
      }
    });

    // リンク要素は常に有効にする
    const linkElements = this.elm.querySelectorAll(
      '.tablecontainer > table > tbody > td a'
    ) as NodeListOf<HTMLElement>;
    linkElements.forEach((element) => {
      element.style.pointerEvents = 'auto';
    });
  }

  /**
   * offsetからthis.lastScrollを更新する
   */
  private updateLastScrollFromOffset(): void {
    const currentOffset = storeManager.getData('offset') || 0;
    this.lastScroll = currentOffset * TR_HEIGHT;
  }

  /**
   * スクロールイベントを設定する
   */
  private setupScrollEvents(): void {
    // PC用のホイールイベント
    const mousewheelevent =
      'onwheel' in document
        ? 'wheel'
        : 'onmousewheel' in document
        ? 'mousewheel'
        : 'DOMMouseScroll';
    this.tbody.addEventListener(mousewheelevent, this.scroll.bind(this));

    // tablecontainerの要素を取得
    this.tablecontainer = this.elm.querySelector(
      '.tablecontainer'
    ) as HTMLElement;

    // モバイル・タブレット用のタッチイベント（ResultsViewの範囲内のみ）
    const touchElements = [this.tablecontainer, this.tbody];

    touchElements.forEach((element) => {
      element.addEventListener('touchstart', this.handleTouchStart.bind(this), {
        passive: false,
        capture: true,
      });
      element.addEventListener('touchmove', this.handleTouchMove.bind(this), {
        passive: false,
        capture: true,
      });
      element.addEventListener('touchend', this.handleTouchEnd.bind(this), {
        passive: false,
        capture: true,
      });
    });

    // タップ処理完了イベントのリスナーを追加
    this.tbody.addEventListener(
      'tapCompleted',
      this.handleTapCompleted.bind(this)
    );
  }

  /**
   * タッチ開始イベントを処理する
   * @param e - タッチイベント
   */
  private handleTouchStart(e: TouchEvent): void {
    // ResultsViewの範囲内かどうかをチェック
    if (
      !this.elm.contains(e.target as Node) &&
      !this.elm.contains(e.currentTarget as Node)
    ) {
      return;
    }

    // tablecontainerまたはtbodyで処理する
    if (
      e.currentTarget !== this.tablecontainer &&
      e.currentTarget !== this.tbody
    ) {
      return;
    }

    if (e.touches.length !== 1) return;

    // 状態をリセット
    this.isScrolling = false;
    this.touchDistance = 0;
    this.touchStartY = e.touches[0].clientY;
    this.touchStartX = e.touches[0].clientX;
    this.touchLastY = this.touchStartY;
    this.touchLastX = this.touchStartX;
    this.touchStartTime = Date.now();
    this.lastTouchTime = this.touchStartTime;

    // スクロールバーのドラッグ処理と同じように開始位置を記録
    this.touchStartOffset = storeManager.getData('offset') || 0;
    this.lastScroll = (storeManager.getData('offset') || 0) * TR_HEIGHT;

    // タッチ開始時はpointer-eventsを有効化
    this.setTouchElementsPointerEvents(true);
  }

  /**
   * タッチ移動イベントを処理する
   * @param e - タッチイベント
   */
  private handleTouchMove(e: TouchEvent): void {
    if (e.touches.length !== 1) return;

    // ResultsViewの範囲内かどうかをチェック
    if (
      !this.elm.contains(e.target as Node) &&
      !this.elm.contains(e.currentTarget as Node)
    ) {
      return;
    }

    // tablecontainerまたはtbodyで処理する
    if (
      e.currentTarget !== this.tablecontainer &&
      e.currentTarget !== this.tbody
    ) {
      return;
    }

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;

    const totalDeltaY = currentY - this.touchStartY;
    const totalDeltaX = currentX - this.touchStartX;
    this.touchDistance = Math.sqrt(
      totalDeltaX * totalDeltaX + totalDeltaY * totalDeltaY
    );

    // スクロール判定：縦方向の移動が横方向より大きく、かつ閾値を超えた場合
    if (
      Math.abs(totalDeltaY) > Math.abs(totalDeltaX) &&
      this.touchDistance > ResultsView.SCROLL_THRESHOLD
    ) {
      if (!this.isScrolling) {
        // スクロール開始
        this.isScrolling = true;
        this.setTouchElementsPointerEvents(false); // スクロール中はpointer-eventsを無効化
        this.initializeScrollBarPosition();
      }

      this.touchLastY = currentY;
      this.handleScrollWithScrollBarFeedback(
        -totalDeltaY * ResultsView.SCROLL_SENSITIVITY
      );
    }
  }

  /**
   * タッチ終了イベントを処理する
   * @param e - タッチイベント
   */
  private handleTouchEnd(e: TouchEvent): void {
    this.touchDuration = Date.now() - this.touchStartTime;

    // タップ判定：移動距離が少なく、時間が短い場合
    if (
      this.touchDistance < ResultsView.SCROLL_THRESHOLD &&
      this.touchDuration < ResultsView.TAP_THRESHOLD
    ) {
      // タップ処理（既存のクリックイベントが処理する）
      this.setTouchElementsPointerEvents(true);
    } else if (this.isScrolling) {
      // スクロール終了
      this.isScrolling = false;
      this.setTouchElementsPointerEvents(false);
      this.deactivateScrollBar();
    } else {
      // その他の場合
      this.setTouchElementsPointerEvents(true);
    }

    // 状態を完全リセット
    this.isScrolling = false;
    this.touchDistance = 0;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchLastX = 0;
    this.touchLastY = 0;
    this.touchStartTime = 0;
    this.lastTouchTime = 0;
  }

  /**
   * タップ処理完了時の処理
   * @param e - カスタムイベント
   */
  private handleTapCompleted(e: Event): void {
    if (!this.isTouchDevice) return;

    // タップ処理完了後、一時的にpointer-eventsを無効化
    this.setTouchElementsPointerEvents(false);
  }

  /**
   * スクロールバーのアクティブ状態を解除する
   */
  private deactivateScrollBar(): void {
    const scrollBar = this.elm.querySelector('.scroll-bar') as HTMLElement;
    if (scrollBar) {
      scrollBar.classList.remove('-active');
    }
  }

  /**
   * スクロール処理を行う
   * @param deltaY - Y方向のスクロール量
   */
  private handleScroll(deltaY: number): void {
    const totalHeight = storeManager.getData('numberOfRecords') * TR_HEIGHT;
    let availableScrollY =
        totalHeight - storeManager.getData('rowCount') * TR_HEIGHT,
      wheelScroll: number;
    availableScrollY = availableScrollY < 0 ? 0 : availableScrollY;

    // スクロール量の計算
    wheelScroll = this.lastScroll + deltaY;
    wheelScroll = wheelScroll < 0 ? 0 : wheelScroll;
    wheelScroll =
      wheelScroll > availableScrollY ? availableScrollY : wheelScroll;

    if (wheelScroll === this.lastScroll) return;

    // スクロール量決定
    this.lastScroll = wheelScroll;

    // 表示行位置
    let offset = Math.ceil(this.lastScroll / TR_HEIGHT);
    storeManager.setData('offset', offset);
  }

  /**
   * スクロールバーを直接操作している感覚のスクロール処理
   * @param deltaY - Y方向のスクロール量
   */
  private handleScrollWithScrollBarFeedback(deltaY: number): void {
    const rowCount = storeManager.getData('rowCount');
    const numberOfRecords = storeManager.getData('numberOfRecords');

    // スクロールバーのドラッグ処理と同じように開始位置からの累積移動量を使用
    const availableHeight = rowCount * TR_HEIGHT;
    const offsetRate = deltaY / availableHeight;
    let newOffset =
      Math.ceil(offsetRate * numberOfRecords) + this.touchStartOffset;

    // 境界チェック
    newOffset = newOffset < 0 ? 0 : newOffset;
    newOffset =
      newOffset + rowCount > numberOfRecords
        ? numberOfRecords - rowCount
        : newOffset;

    // lastScrollを更新
    this.lastScroll = newOffset * TR_HEIGHT;

    // スクロールバーを直接操作している感覚でoffsetを更新
    this.updateScrollBarDirectly(newOffset);

    // データ更新（遅延読み込み機能を維持）
    storeManager.setData('offset', newOffset);
  }

  /**
   * スクロールバーの位置を初期化する
   */
  private initializeScrollBarPosition(): void {
    const scrollBar = this.elm.querySelector('.scroll-bar') as HTMLElement;
    if (scrollBar) {
      scrollBar.classList.add('-active');
    }
  }

  /**
   * スクロールバーを直接操作している感覚で更新する
   * @param offset - オフセット値
   */
  private updateScrollBarDirectly(offset: number): void {
    const scrollBar = this.elm.querySelector('.scroll-bar') as HTMLElement;
    if (!scrollBar) return;

    const rowCount = storeManager.getData('rowCount');
    const numberOfRecords = storeManager.getData('numberOfRecords');
    const totalHeight = numberOfRecords * TR_HEIGHT;
    const displayHeight = rowCount * TR_HEIGHT;
    const displayRate = displayHeight / totalHeight;

    // スクロールバーの高さと位置を計算
    let barHeight = Math.ceil(displayHeight * displayRate);
    barHeight = barHeight < 30 ? 30 : barHeight; // MIN_HEIGHT

    const availableHeight = displayHeight - barHeight;
    const availableRate = availableHeight / totalHeight;
    const barTop = Math.ceil(offset * TR_HEIGHT * availableRate);

    // スクロールバーの位置を直接更新
    const bar = scrollBar.querySelector('.bar') as HTMLElement;
    if (bar) {
      bar.style.height = `${barHeight}px`;
      bar.style.top = `${barTop}px`;

      // 位置表示も更新
      const position = bar.querySelector('.position') as HTMLElement;
      if (position) {
        position.textContent = String(offset + 1);
      }
    }

    // アクティブ状態を維持
    scrollBar.classList.add('-active');
  }

  /**
   * 表示サイズを更新する
   */
  private updateDisplaySize(): void {
    if (storeManager.getData('isFetching')) {
      // フェッチ中は処理をスキップ
      return;
    }

    // 表示数
    const maxRowCount = Math.floor(
        (window.innerHeight -
          this.tbody.getBoundingClientRect().top -
          storeManager.getData('karyotype').height -
          COMMON_FOOTER_HEIGHT -
          2) /
          TR_HEIGHT
      ),
      numberOfRecords = storeManager.getData('numberOfRecords'),
      offset = storeManager.getData('offset'),
      rowCount = Math.min(maxRowCount, numberOfRecords);
    storeManager.setData('rowCount', rowCount);
    // 行が足らなければ追加
    if (this.rows.length < rowCount) {
      for (let i = this.rows.length; i < rowCount; i++) {
        const tr = new ResultsRowView(i);
        this.rows.push(tr);
        this.tbody.appendChild(tr.tr);
      }
    }
    // オフセット量の調整
    const onScreen = numberOfRecords - offset,
      belowSpace = maxRowCount - onScreen;
    if (belowSpace > 0) {
      // 隙間ができてしまい
      if (offset >= belowSpace) {
        // 上の隙間の方が大きい場合、差分をオフセットにセット
        storeManager.setData('offset', offset - belowSpace);
      } else {
        // 下の隙間が大きい場合、オフセット量をゼロに
        storeManager.setData('offset', 0);
      }
    }

    // 行の更新を確実に行う
    requestAnimationFrame(() => {
      this.rows.forEach((row) => row.updateTableRow());

      if (this.isTouchDevice) {
        this.setTouchElementsPointerEvents(false);
      }
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
    this.handleScroll(e.deltaY);
  }

  /**
   * オフセットの変更時の処理
   * @param offset - 新しいオフセット値
   */
  offset(offset: number): void {
    this.lastScroll = offset * TR_HEIGHT;

    // データ更新中は処理をスキップ
    if (
      storeManager.getData('isStoreUpdating') ||
      storeManager.getData('isFetching')
    ) {
      return;
    }

    // 染色体位置
    const displayingRegions1: { [key: string]: number[] } = {},
      displayingRegions2: { [key: string]: { start: number; end: number } } =
        {};

    for (let i = 0; i <= storeManager.getData('rowCount') - 1; i++) {
      const record = storeManager.getRecordByIndex(i);

      // recordが実際のデータオブジェクトの場合のみ処理
      if (record && typeof record === 'object' && record.chromosome) {
        if (displayingRegions1[record.chromosome] === undefined) {
          displayingRegions1[record.chromosome] = [];
        }
        displayingRegions1[record.chromosome].push(record.start);
      }
    }

    // データが存在する場合のみ処理
    if (Object.keys(displayingRegions1).length > 0) {
      for (const key in displayingRegions1) {
        displayingRegions2[key] = {
          start: Math.min(...displayingRegions1[key]),
          end: Math.max(...displayingRegions1[key]),
        };
      }
      storeManager.setData('displayingRegionsOnChromosome', displayingRegions2);
    }
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
    this.messages.innerHTML = '';

    if (messages.notice) {
      this.messages.innerHTML += `<div class="message -notice">${messages.notice}</div>`;
    }
    if (messages.warning) {
      this.messages.innerHTML += `<div class="message -warning">${messages.warning}</div>`;
    }
    if (messages.error) {
      this.messages.innerHTML += `<div class="message -error">${messages.error}</div>`;
    }
  }

  /**
   * 検索ステータスの表示
   * @param status - ステータスオブジェクト
   */
  searchStatus(status: { available: number; filtered: number }): void {
    this.status.innerHTML = `The number of available variations is ${status.available.toLocaleString()} out of <span class="bigger">${status.filtered.toLocaleString()}</span>.`;
    if (status.filtered === 0) {
      this.elm.classList.add('-not-found');
    } else {
      this.elm.classList.remove('-not-found');
    }
  }

  /**
   * 検索結果の表示
   * @param _results - 検索結果（未使用）
   */
  searchResults(_results: any): void {
    // 更新中フラグのチェックを1回だけに
    const isUpdating = storeManager.getData('isStoreUpdating');
    const isFetching = storeManager.getData('isFetching');

    if (isUpdating || isFetching) {
      requestAnimationFrame(() => this.searchResults(_results));
      return;
    }

    if (!this._validateData()) {
      console.warn('データの検証に失敗しました');
      return;
    }

    this.updateDisplaySize();
  }

  /**
   * データの妥当性を検証する
   * @returns 検証結果
   */
  private _validateData(): boolean {
    const results = storeManager.getData('searchResults');
    const numberOfRecords = storeManager.getData('numberOfRecords');

    return (
      Array.isArray(results) &&
      typeof numberOfRecords === 'number' &&
      numberOfRecords >= 0
    );
  }

  /**
   * カラムの表示／非表示を制御する
   * @param columns - カラム設定の配列
   */
  columns(columns: Array<{ id: string; isUsed: boolean }>): void {
    // 既存のスタイルの削除
    while (this.stylesheet.sheet!.cssRules.length > 0) {
      this.stylesheet.sheet!.deleteRule(0);
    }
    // スタイルの追加
    for (let i = 0; i < columns.length; i++) {
      const column = columns[i];
      this.stylesheet.sheet!.insertRule(
        `
      .tablecontainer > table.results-view th.${
        column.id
      }, .tablecontainer > table.results-view td.${column.id} {
        display: ${column.isUsed ? 'table-cell' : 'none'}
      }`,
        i
      );
    }
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
          this.shiftSelectedRow(-1);
          break;
        case 'ArrowDown': // ↓
          this.shiftSelectedRow(1);
          break;
        case 'Escape': // 選択解除
          storeManager.setData('selectedRow', undefined);
          break;
      }
    }
  }

  /**
   * 選択行を移動する
   * @param value - 移動量（+1で下、-1で上）
   */
  private shiftSelectedRow(value: number): void {
    let currentIndex = storeManager.getData('selectedRow'),
      shiftIndex = currentIndex + value,
      rowCount = storeManager.getData('rowCount'),
      offset = storeManager.getData('offset'),
      numberOfRecords = storeManager.getData('numberOfRecords');
    if (shiftIndex < 0) {
      shiftIndex = 0;
      if (offset > 0) {
        // 上にスクロール
        offset--;
        storeManager.setData('offset', offset);
      }
    } else if (shiftIndex > rowCount - 1) {
      shiftIndex = rowCount - 1;
      if (offset + shiftIndex < numberOfRecords - 1) {
        // 下にスクロール
        offset++;
        storeManager.setData('offset', offset);
      }
    }
    storeManager.setData('selectedRow', shiftIndex);
  }

  /**
   * 核型の変更時の処理
   * @param _karyotype - 核型データ（未使用）
   */
  karyotype(_karyotype: any): void {
    this.updateDisplaySize();
  }
}
