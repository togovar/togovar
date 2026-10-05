import type {
  DragState,
  DragManagerConfig,
  TouchEventOptions,
} from '../../../types';
import { supportsMouseInteraction } from '../../../utils/deviceDetection';

/**
 * マウスとタッチ両方のドラッグ操作を管理するクラス。
 * スクロールバーのドラッグに特化し、座標計算とイベント管理を担う。
 */
export class DragManager {
  private static readonly TOUCH_EVENT_OPTIONS: TouchEventOptions = { passive: false };

  private mouseDragState: DragState | undefined;
  private isTouchDragging = false;
  private touchStartY = 0;
  private touchStartTop = 0;

  private readonly scrollBarElement: HTMLElement;
  private readonly container: HTMLElement;
  private readonly onDragCallback: (_top: number) => void;
  private readonly onVisualStateChange: (_isDragging: boolean) => void;

  // removeEventListener で同一参照が必要なため、束縛済みハンドラーをフィールドに保持する
  private readonly boundMouseDown: (_e: MouseEvent) => void;
  private readonly boundMouseMove: (_e: MouseEvent) => void;
  private readonly boundMouseUp: () => void;
  private readonly boundTouchStart: (_e: TouchEvent) => void;
  private readonly boundTouchMove: (_e: TouchEvent) => void;
  private readonly boundTouchEnd: (_e: TouchEvent) => void;

  constructor(config: DragManagerConfig) {
    this.scrollBarElement = config.scrollBarElement;
    this.container = config.container;
    this.onDragCallback = config.onDragCallback;
    this.onVisualStateChange = config.onVisualStateChange;

    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);
    this.boundTouchStart = this.handleTouchStart.bind(this);
    this.boundTouchMove = this.handleTouchMove.bind(this);
    this.boundTouchEnd = this.handleTouchEnd.bind(this);
  }

  // ================================================================
  // ライフサイクル管理
  // ================================================================

  /**
   * デバイス種別を判定してマウスまたはタッチのイベントリスナーを登録する。
   */
  initializeDragManager(): void {
    if (supportsMouseInteraction()) {
      this.initializeMouseDrag();
    }
    this.initializeTouchDrag();
  }

  /**
   * 全イベントリスナーを解除して内部状態をリセットする。
   */
  destroyDragManager(): void {
    this.removeMouseEventListeners();
    this.removeTouchEventListeners();
    this.resetState();
  }

  // ================================================================
  // マウスドラッグ
  // ================================================================

  /**
   * マウスドラッグ状態オブジェクトを初期化し、リスナーを登録する。
   * mousemove/mouseup はスクロールバー外でも追従する必要があるため document に登録する。
   */
  private initializeMouseDrag(): void {
    this.mouseDragState = { isDragging: false, startY: 0, startTop: 0 };
    this.attachMouseEventListeners();
  }

  /**
   * mousedown はスクロールバー上、move/up は document に登録してドラッグ中のカーソル追従を保証する。
   */
  private attachMouseEventListeners(): void {
    this.scrollBarElement.addEventListener('mousedown', this.boundMouseDown);
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  /**
   * removeEventListener は登録時と同じ参照が必要なため、boundXxx フィールドで解除する。
   */
  private removeMouseEventListeners(): void {
    this.scrollBarElement.removeEventListener('mousedown', this.boundMouseDown);
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }

  /**
   * ドラッグ開始時点の座標とスクロールバー位置を記録し、以降の move で差分計算できるようにする。
   */
  private handleMouseDown(e: MouseEvent): void {
    if (!this.mouseDragState) return;

    e.preventDefault();
    this.mouseDragState.isDragging = true;
    this.mouseDragState.startY = e.clientY;
    this.mouseDragState.startTop = this.getCurrentScrollBarTop();

    this.onVisualStateChange(true);
  }

  /**
   * 開始位置との差分だけ top を動かすことで、クリック位置を起点にした自然なドラッグを実現する。
   */
  private handleMouseMove(e: MouseEvent): void {
    if (!this.mouseDragState?.isDragging) return;

    e.preventDefault();

    const deltaY = e.clientY - this.mouseDragState.startY;
    const newTop = this.mouseDragState.startTop + deltaY;

    this.onDragCallback(this.constrainPositionWithinBounds(newTop));
  }

  /**
   * isDragging フラグをクリアしてドラッグ終了を通知する。
   * mouseup が document に登録されているため、スクロールバー外で離しても確実に終了できる。
   */
  private handleMouseUp(): void {
    if (!this.mouseDragState?.isDragging) return;

    this.mouseDragState.isDragging = false;
    this.onVisualStateChange(false);
  }

  // ================================================================
  // タッチドラッグ
  // ================================================================

  /**
   * タッチドラッグはマウスと異なりデバイス非依存で常に登録する。
   */
  private initializeTouchDrag(): void {
    this.attachTouchEventListeners();
  }

  /**
   * passive: false でスクロールバードラッグ中のページスクロールを抑制する。
   */
  private attachTouchEventListeners(): void {
    this.scrollBarElement.addEventListener(
      'touchstart',
      this.boundTouchStart,
      DragManager.TOUCH_EVENT_OPTIONS
    );
    this.scrollBarElement.addEventListener(
      'touchmove',
      this.boundTouchMove,
      DragManager.TOUCH_EVENT_OPTIONS
    );
    this.scrollBarElement.addEventListener(
      'touchend',
      this.boundTouchEnd,
      DragManager.TOUCH_EVENT_OPTIONS
    );
  }

  /**
   * addEventListener と同じ参照・オプションで登録したリスナーを解除する。
   */
  private removeTouchEventListeners(): void {
    this.scrollBarElement.removeEventListener('touchstart', this.boundTouchStart);
    this.scrollBarElement.removeEventListener('touchmove', this.boundTouchMove);
    this.scrollBarElement.removeEventListener('touchend', this.boundTouchEnd);
  }

  /**
   * タッチ開始時の指の位置とスクロールバー位置を記録し、move での差分計算の基点にする。
   */
  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    this.isTouchDragging = true;
    this.touchStartY = e.touches[0].clientY;
    this.touchStartTop = this.getCurrentScrollBarTop();

    this.onVisualStateChange(true);
  }

  /**
   * 開始位置との差分を加算してスクロールバーを指に追従させる。
   */
  private handleTouchMove(e: TouchEvent): void {
    if (!this.isTouchDragging) return;
    e.preventDefault();

    const deltaY = e.touches[0].clientY - this.touchStartY;
    const newTop = this.touchStartTop + deltaY;

    this.onDragCallback(this.constrainPositionWithinBounds(newTop));
  }

  /**
   * タッチ終了でドラッグフラグをクリアし、視覚状態をドラッグ解除に戻す。
   */
  private handleTouchEnd(e: TouchEvent): void {
    if (!this.isTouchDragging) return;
    e.preventDefault();

    this.isTouchDragging = false;
    this.onVisualStateChange(false);
  }

  // ================================================================
  // 座標管理
  // ================================================================

  /**
   * style.top は文字列で格納されているため数値化して返す。未設定なら 0 とする。
   */
  private getCurrentScrollBarTop(): number {
    return parseInt(this.scrollBarElement.style.top) || 0;
  }

  /**
   * スクロールバーがコンテナからはみ出さないよう top 値を制約する。
   */
  private constrainPositionWithinBounds(newTop: number): number {
    const maxTop = this.container.offsetHeight - this.scrollBarElement.offsetHeight;
    return Math.max(0, Math.min(newTop, maxTop));
  }

  // ================================================================
  // 状態リセット
  // ================================================================

  /**
   * destroy 時に中途半端なドラッグ状態が残らないよう全フィールドを初期値に戻す。
   */
  private resetState(): void {
    if (this.mouseDragState) {
      this.mouseDragState.isDragging = false;
      this.mouseDragState = undefined;
    }
    this.isTouchDragging = false;
    this.touchStartY = 0;
    this.touchStartTop = 0;
  }
}
