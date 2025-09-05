import { ScrollCallbacks, TouchState, TouchGesture } from '../../types';

/** タッチ対象要素のセレクタ定数 */
const TOUCH_ELEMENTS_SELECTOR =
  '.tablecontainer > table > tbody > tr, .tablecontainer > table > tbody > td, .tablecontainer > table > tbody > td *';

/** タッチ設定の定数 */
const TOUCH_CONFIG = {
  /** スクロール感度の調整 */
  SCROLL_SENSITIVITY: 0.1,
  /** スクロール判定の閾値（ピクセル） */
  SCROLL_THRESHOLD: 10,
  /** タップ判定の閾値（ミリ秒） */
  TAP_THRESHOLD: 300,
} as const;

/**
 * タッチイベント処理を管理するクラス
 * タッチ操作の検出、タップとスクロールの判定、pointer-events制御を行う
 */
export class ResultsViewTouchHandler {
  /** ルート要素 */
  private elm: HTMLElement;
  /** テーブルボディ要素 */
  private tbody: HTMLElement;
  /** テーブルコンテナ要素 */
  private tablecontainer: HTMLElement;

  /** タッチ状態 */
  private touchState: TouchState;
  /** タッチデバイス判定フラグ */
  private isTouchDevice: boolean = false;

  /** スクロールコールバック */
  private scrollCallbacks: ScrollCallbacks = {};

  /** Bound event handlers for proper cleanup */
  private readonly _boundHandlers = {
    touchStart: this._handleTouchStart.bind(this),
    touchMove: this._handleTouchMove.bind(this),
    touchEnd: this._handleTouchEnd.bind(this),
    tapCompleted: this._handleTapCompleted.bind(this),
  };

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

    this.initializeTouchState();
    this.detectTouchDevice();
    this.setupTouchEvents();
  }

  // ========================================
  // Public Methods
  // ========================================

  /**
   * スクロールコールバックを設定
   * @param callbacks - コールバック関数オブジェクト
   */
  setScrollCallbacks(callbacks: ScrollCallbacks): void {
    this.scrollCallbacks = { ...callbacks };
  }

  /**
   * タッチ開始時のオフセットを設定
   * @param offset - オフセット値
   */
  setTouchStartOffset(offset: number): void {
    this.touchState.startOffset = offset;
  }

  /**
   * タッチデバイスかどうかを返す
   * @returns タッチデバイスかどうか
   */
  get isTouchEnabled(): boolean {
    return this.isTouchDevice;
  }

  /**
   * タッチ要素のpointer-eventsを制御する
   * @param enabled - pointer-eventsを有効にするかどうか
   */
  setTouchElementsPointerEvents(enabled: boolean): void {
    this._updateTouchElementsPointerEvents(enabled);
    this._ensureLinkElementsEnabled();
  }

  // ========================================
  // Private Methods
  // ========================================

  /**
   * タッチ状態を初期化する
   */
  private initializeTouchState(): void {
    this.touchState = {
      startY: 0,
      startX: 0,
      startTime: 0,
      lastY: 0,
      lastX: 0,
      distance: 0,
      duration: 0,
      isScrolling: false,
      startOffset: 0,
    };
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
    const touchElements = [this.tablecontainer, this.tbody];

    touchElements.forEach((element) => {
      element.addEventListener('touchstart', this._boundHandlers.touchStart, {
        passive: false,
        capture: true,
      });
      element.addEventListener('touchmove', this._boundHandlers.touchMove, {
        passive: false,
        capture: true,
      });
      element.addEventListener('touchend', this._boundHandlers.touchEnd, {
        passive: false,
        capture: true,
      });
    });

    this.tbody.addEventListener(
      'tapCompleted',
      this._boundHandlers.tapCompleted
    );
  }

  /**
   * タッチ要素のpointer-eventsを更新する
   */
  private _updateTouchElementsPointerEvents(enabled: boolean): void {
    const touchElements = this.elm.querySelectorAll(TOUCH_ELEMENTS_SELECTOR);

    touchElements.forEach((element) => {
      (element as HTMLElement).style.pointerEvents = enabled ? 'auto' : 'none';
    });
  }

  /**
   * リンク要素を常に有効にする
   */
  private _ensureLinkElementsEnabled(): void {
    const linkElements = this.elm.querySelectorAll(
      '.tablecontainer > table > tbody > td a'
    );

    linkElements.forEach((element) => {
      (element as HTMLElement).style.pointerEvents = 'auto';
    });
  }

  /**
   * タッチが有効な範囲内かチェックする
   */
  private _isValidTouchTarget(e: TouchEvent): boolean {
    return (
      (this.elm.contains(e.target as Node) ||
        this.elm.contains(e.currentTarget as Node)) &&
      (e.currentTarget === this.tablecontainer ||
        e.currentTarget === this.tbody)
    );
  }

  /**
   * タッチ状態をリセットする
   */
  private _resetTouchState(): void {
    this.touchState.isScrolling = false;
    this.touchState.distance = 0;
    this.touchState.startY = 0;
    this.touchState.startX = 0;
    this.touchState.lastY = 0;
    this.touchState.lastX = 0;
    this.touchState.startTime = 0;
    this.touchState.duration = 0;
  }

  /**
   * タッチジェスチャーを判定する
   */
  private _analyzeTouchGesture(
    currentY: number,
    currentX: number
  ): TouchGesture {
    const deltaY = currentY - this.touchState.startY;
    const deltaX = currentX - this.touchState.startX;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    const isVerticalScroll = Math.abs(deltaY) > Math.abs(deltaX);
    const exceedsThreshold = distance > TOUCH_CONFIG.SCROLL_THRESHOLD;
    const isScroll = isVerticalScroll && exceedsThreshold;

    const duration = Date.now() - this.touchState.startTime;
    const isTap =
      distance < TOUCH_CONFIG.SCROLL_THRESHOLD &&
      duration < TOUCH_CONFIG.TAP_THRESHOLD;

    return {
      isTap,
      isScroll,
      deltaY,
      deltaX,
    };
  }

  /**
   * タッチ開始イベントを処理する
   * @param e - タッチイベント
   */
  private _handleTouchStart(e: TouchEvent): void {
    if (!this._isValidTouchTarget(e) || e.touches.length !== 1) {
      return;
    }

    this._resetTouchState();

    const touch = e.touches[0];
    this.touchState.startY = touch.clientY;
    this.touchState.startX = touch.clientX;
    this.touchState.lastY = touch.clientY;
    this.touchState.lastX = touch.clientX;
    this.touchState.startTime = Date.now();

    this.setTouchElementsPointerEvents(true);
  }

  /**
   * タッチ移動イベントを処理する
   * @param e - タッチイベント
   */
  private _handleTouchMove(e: TouchEvent): void {
    if (!this._isValidTouchTarget(e) || e.touches.length !== 1) {
      return;
    }

    const touch = e.touches[0];
    const gesture = this._analyzeTouchGesture(touch.clientY, touch.clientX);

    this.touchState.distance = Math.sqrt(
      gesture.deltaX * gesture.deltaX + gesture.deltaY * gesture.deltaY
    );

    if (gesture.isScroll) {
      if (!this.touchState.isScrolling) {
        this.touchState.isScrolling = true;
        this.setTouchElementsPointerEvents(false);
        this.scrollCallbacks.onScrollStart?.();
      }

      this.touchState.lastY = touch.clientY;
      this.scrollCallbacks.onScroll?.(
        -gesture.deltaY * TOUCH_CONFIG.SCROLL_SENSITIVITY,
        this.touchState.startOffset
      );
    }
  }

  /**
   * タッチ終了イベントを処理する
   * @param e - タッチイベント
   */
  private _handleTouchEnd(_e: TouchEvent): void {
    this.touchState.duration = Date.now() - this.touchState.startTime;

    const isTap =
      this.touchState.distance < TOUCH_CONFIG.SCROLL_THRESHOLD &&
      this.touchState.duration < TOUCH_CONFIG.TAP_THRESHOLD;

    if (isTap) {
      this.setTouchElementsPointerEvents(true);
    } else if (this.touchState.isScrolling) {
      this.touchState.isScrolling = false;
      this.setTouchElementsPointerEvents(false);
      this.scrollCallbacks.onScrollEnd?.();
    } else {
      this.setTouchElementsPointerEvents(true);
    }

    this._resetTouchState();
  }

  /**
   * タップ処理完了時の処理
   * @param e - カスタムイベント
   */
  private _handleTapCompleted(_e: Event): void {
    if (!this.isTouchDevice) return;
    this.setTouchElementsPointerEvents(false);
  }

  /**
   * Clean up all resources and event listeners
   * Call this method when the TouchHandler is no longer needed
   */
  destroy(): void {
    const touchElements = [this.tablecontainer, this.tbody];

    // Remove touch event listeners
    touchElements.forEach((element) => {
      element.removeEventListener(
        'touchstart',
        this._boundHandlers.touchStart,
        true
      );
      element.removeEventListener(
        'touchmove',
        this._boundHandlers.touchMove,
        true
      );
      element.removeEventListener(
        'touchend',
        this._boundHandlers.touchEnd,
        true
      );
    });

    // Remove tap completed listener
    this.tbody.removeEventListener(
      'tapCompleted',
      this._boundHandlers.tapCompleted
    );

    // Clear callbacks
    this.scrollCallbacks = {};

    // Clear DOM references
    this.elm = null as any;
    this.tbody = null as any;
    this.tablecontainer = null as any;
  }
}
