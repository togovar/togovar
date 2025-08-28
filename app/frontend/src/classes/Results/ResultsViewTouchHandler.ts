/**
 * タッチイベント処理を管理するクラス
 * タッチ操作の検出、タップとスクロールの判定、pointer-events制御を行う
 */
export class ResultsViewTouchHandler {
  /** スクロール感度の調整 */
  static readonly SCROLL_SENSITIVITY: number = 0.1;
  /** スクロール判定の閾値（ピクセル） */
  static readonly SCROLL_THRESHOLD: number = 10;
  /** タップ判定の閾値（ミリ秒） */
  static readonly TAP_THRESHOLD: number = 300;

  /** ルート要素 */
  private elm: HTMLElement;
  /** テーブルボディ要素 */
  private tbody: HTMLElement;
  /** テーブルコンテナ要素 */
  private tablecontainer: HTMLElement;

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

  // コールバック関数
  private onScrollStart?: () => void;
  private onScroll?: (deltaY: number) => void;
  private onScrollEnd?: () => void;

  /**
   * コンストラクタ
   * @param elm - ルート要素
   * @param tbody - テーブルボディ要素
   * @param tablecontainer - テーブルコンテナ要素
   */
  constructor(
    elm: HTMLElement,
    tbody: HTMLElement,
    tablecontainer: HTMLElement
  ) {
    this.elm = elm;
    this.tbody = tbody;
    this.tablecontainer = tablecontainer;

    this.detectTouchDevice();
    this.setupTouchEvents();
  }

  /**
   * スクロールコールバックを設定
   * @param callbacks - コールバック関数オブジェクト
   */
  setScrollCallbacks(callbacks: {
    onScrollStart?: () => void;
    onScroll?: (deltaY: number) => void;
    onScrollEnd?: () => void;
  }): void {
    this.onScrollStart = callbacks.onScrollStart;
    this.onScroll = callbacks.onScroll;
    this.onScrollEnd = callbacks.onScrollEnd;
  }

  /**
   * タッチ開始時のオフセットを設定
   * @param offset - オフセット値
   */
  setTouchStartOffset(offset: number): void {
    this.touchStartOffset = offset;
  }

  /**
   * タッチデバイスかどうかを返す
   * @returns タッチデバイスかどうか
   */
  get isTouchEnabled(): boolean {
    return this.isTouchDevice;
  }

  /**
   * タッチデバイスを検出する
   */
  private detectTouchDevice(): void {
    this.isTouchDevice =
      'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * タッチイベントを設定する
   */
  private setupTouchEvents(): void {
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
   * タッチ要素のpointer-eventsを制御する
   * @param enabled - pointer-eventsを有効にするかどうか
   */
  setTouchElementsPointerEvents(enabled: boolean): void {
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
      this.touchDistance > ResultsViewTouchHandler.SCROLL_THRESHOLD
    ) {
      if (!this.isScrolling) {
        // スクロール開始
        this.isScrolling = true;
        this.setTouchElementsPointerEvents(false); // スクロール中はpointer-eventsを無効化
        this.onScrollStart?.();
      }

      this.touchLastY = currentY;
      this.onScroll?.(
        -totalDeltaY * ResultsViewTouchHandler.SCROLL_SENSITIVITY
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
      this.touchDistance < ResultsViewTouchHandler.SCROLL_THRESHOLD &&
      this.touchDuration < ResultsViewTouchHandler.TAP_THRESHOLD
    ) {
      // タップ処理（既存のクリックイベントが処理する）
      this.setTouchElementsPointerEvents(true);
    } else if (this.isScrolling) {
      // スクロール終了
      this.isScrolling = false;
      this.setTouchElementsPointerEvents(false);
      this.onScrollEnd?.();
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
}
