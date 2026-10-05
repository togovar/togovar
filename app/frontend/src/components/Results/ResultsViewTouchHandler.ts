import type { ScrollCallbacks, TouchState, TouchGesture } from '../../types';
import { isTouchDevice } from '../../utils/deviceDetection';

// アクセシビリティ上、リンク要素はタッチ対象から除外する
const TOUCH_ELEMENTS_SELECTOR =
  '.tablecontainer > table > tbody > tr, .tablecontainer > table > tbody > td, .tablecontainer > table > tbody > td *:not(a)';

const TOUCH_CONFIG = {
  SCROLL_SENSITIVITY: 1.0, // ホイールスクロールと揃えた1:1の感度
  SCROLL_THRESHOLD: 10,    // スクロール判定の最低移動量（px）
  TAP_THRESHOLD: 300,      // タップ判定の最長時間（ms）
} as const;

/**
 * テーブル形式の検索結果に対するタッチ操作ハンドラー。
 * タップとスクロールジェスチャーを識別し、仮想スクロールとの連携を担う。
 */
export class ResultsViewTouchHandler {
  private container: HTMLElement;
  private tbody: HTMLElement;
  private tablecontainer: HTMLElement;
  private isDestroyed = false;
  private touchState: TouchState = {
    startY: 0,
    startX: 0,
    startTime: 0,
    distance: 0,
    isScrolling: false,
  };
  private scrollCallbacks: ScrollCallbacks = {};

  // removeEventListener で同一参照が必要なため、束縛済みハンドラーをフィールドに保持する
  private readonly boundHandlers = {
    touchStart: this.handleTouchStart.bind(this),
    touchMove: this.handleTouchMove.bind(this),
    touchEnd: this.handleTouchEnd.bind(this),
    tapCompleted: this.handleTapCompleted.bind(this),
  };

  constructor(
    container: HTMLElement,
    tbody: HTMLElement,
    tablecontainer: HTMLElement
  ) {
    this.container = container;
    this.tbody = tbody;
    this.tablecontainer = tablecontainer;
    this.setupTouchEvents();
  }

  // ================================================================
  // 設定・コールバック
  // ================================================================

  /** スクロール開始・中・終了の各タイミングで呼ばれるコールバックを登録する。 */
  setScrollCallbacks(callbacks: ScrollCallbacks): void {
    if (this.isDestroyed) return;
    this.scrollCallbacks = { ...callbacks };
  }

  // ================================================================
  // ポインターイベント制御
  // ================================================================

  /**
   * テーブル要素のインタラクティブ性を切り替える。
   * スクロール中は誤タップを防ぐため false にし、ジェスチャー終了後に true へ戻す。
   */
  setElementsInteractable(enabled: boolean): void {
    this.container.querySelectorAll(TOUCH_ELEMENTS_SELECTOR).forEach((el) => {
      (el as HTMLElement).style.pointerEvents = enabled ? 'auto' : 'none';
    });
  }

  // ================================================================
  // ライフサイクル管理
  // ================================================================

  /** イベントリスナーとコールバックをすべて解除してメモリリークを防ぐ。 */
  destroy(): void {
    if (this.isDestroyed) return;

    [this.tablecontainer, this.tbody].forEach((el) => {
      el.removeEventListener('touchstart', this.boundHandlers.touchStart);
      el.removeEventListener('touchmove', this.boundHandlers.touchMove);
      el.removeEventListener('touchend', this.boundHandlers.touchEnd);
    });
    this.tbody.removeEventListener('tapCompleted', this.boundHandlers.tapCompleted);

    this.scrollCallbacks = {};
    this.isDestroyed = true;
  }

  // ================================================================
  // 初期化
  // ================================================================

  /**
   * タッチイベントを登録する。
   * passive: true により、preventDefault() を呼ばないことをブラウザに伝え
   * スクロール最適化（合成スレッド処理）を有効にする。
   */
  private setupTouchEvents(): void {
    [this.tablecontainer, this.tbody].forEach((el) => {
      el.addEventListener('touchstart', this.boundHandlers.touchStart, { passive: true });
      el.addEventListener('touchmove', this.boundHandlers.touchMove, { passive: true });
      el.addEventListener('touchend', this.boundHandlers.touchEnd, { passive: true });
    });
    this.tbody.addEventListener('tapCompleted', this.boundHandlers.tapCompleted);
  }

  // ================================================================
  // タッチイベントハンドラー
  // ================================================================

  /** タッチ開始：状態を初期化し、ポインターイベントを有効化する。 */
  private handleTouchStart(e: TouchEvent): void {
    if (!this.isValidTouchTarget(e) || e.touches.length !== 1) return;

    this.resetTouchState();
    const touch = e.touches[0];
    this.touchState.startY = touch.clientY;
    this.touchState.startX = touch.clientX;
    this.touchState.startTime = Date.now();
    this.setElementsInteractable(true);
  }

  /** タッチ移動：スクロールジェスチャーを検知し、累積 deltaY をコールバックへ渡す。 */
  private handleTouchMove(e: TouchEvent): void {
    if (!this.isValidTouchTarget(e) || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const gesture = this.analyzeTouchGesture(touch.clientY, touch.clientX);
    this.touchState.distance = gesture.distance;

    if (!gesture.isScroll) return;

    if (!this.touchState.isScrolling) {
      this.touchState.isScrolling = true;
      this.setElementsInteractable(false);
      this.scrollCallbacks.onScrollStart?.();
    }

    this.scrollCallbacks.onScroll?.(-gesture.deltaY * TOUCH_CONFIG.SCROLL_SENSITIVITY);
  }

  /** タッチ終了：タップかスクロールかを判定して操作状態を復元する。 */
  private handleTouchEnd(_e: TouchEvent): void {
    const duration = Date.now() - this.touchState.startTime;
    const isTap =
      this.touchState.distance < TOUCH_CONFIG.SCROLL_THRESHOLD &&
      duration < TOUCH_CONFIG.TAP_THRESHOLD;

    if (isTap) {
      this.setElementsInteractable(true);
    } else if (this.touchState.isScrolling) {
      this.touchState.isScrolling = false;
      this.setElementsInteractable(false);
      this.scrollCallbacks.onScrollEnd?.();
    } else {
      this.setElementsInteractable(true);
    }

    this.resetTouchState();
  }

  /**
   * タップ完了後、タッチデバイスでは次のスクロールに備えてポインターイベントを無効化する。
   * PC（正確なポインター操作が可能）では何もしない。
   */
  private handleTapCompleted(_e: Event): void {
    if (!isTouchDevice()) return;
    this.setElementsInteractable(false);
  }

  // ================================================================
  // ジェスチャー解析
  // ================================================================

  /**
   * 現在のタッチ座標からジェスチャーを解析する。
   * タッチ開始点からの累積移動量で判定し、縦方向かつ閾値超えをスクロールとみなす。
   */
  private analyzeTouchGesture(currentY: number, currentX: number): TouchGesture {
    const deltaY = currentY - this.touchState.startY;
    const deltaX = currentX - this.touchState.startX;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    const isScroll =
      Math.abs(deltaY) > Math.abs(deltaX) &&
      distance > TOUCH_CONFIG.SCROLL_THRESHOLD;

    const duration = Date.now() - this.touchState.startTime;
    const isTap =
      distance < TOUCH_CONFIG.SCROLL_THRESHOLD &&
      duration < TOUCH_CONFIG.TAP_THRESHOLD;

    return { isTap, isScroll, deltaY, deltaX, distance };
  }

  // ================================================================
  // バリデーション・状態管理
  // ================================================================

  /** タッチがこのコンポーネントの管轄要素上で発生したかどうかを検証する。 */
  private isValidTouchTarget(e: TouchEvent): boolean {
    return (
      (this.container.contains(e.target as Node) ||
        this.container.contains(e.currentTarget as Node)) &&
      (e.currentTarget === this.tablecontainer || e.currentTarget === this.tbody)
    );
  }

  /** 次のジェスチャーに備えてタッチ状態をゼロクリアする。 */
  private resetTouchState(): void {
    this.touchState.startY = 0;
    this.touchState.startX = 0;
    this.touchState.startTime = 0;
    this.touchState.distance = 0;
    this.touchState.isScrolling = false;
  }
}
