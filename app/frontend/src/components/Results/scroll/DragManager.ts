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

  private initializeMouseDrag(): void {
    this.mouseDragState = { isDragging: false, startY: 0, startTop: 0 };
    this.attachMouseEventListeners();
  }

  private attachMouseEventListeners(): void {
    this.scrollBarElement.addEventListener('mousedown', this.boundMouseDown);
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  private removeMouseEventListeners(): void {
    this.scrollBarElement.removeEventListener('mousedown', this.boundMouseDown);
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }

  private handleMouseDown(e: MouseEvent): void {
    if (!this.mouseDragState) return;

    e.preventDefault();
    this.mouseDragState.isDragging = true;
    this.mouseDragState.startY = e.clientY;
    this.mouseDragState.startTop = this.getCurrentScrollBarTop();

    this.onVisualStateChange(true);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.mouseDragState?.isDragging) return;

    e.preventDefault();

    const deltaY = e.clientY - this.mouseDragState.startY;
    const newTop = this.mouseDragState.startTop + deltaY;

    this.onDragCallback(this.constrainPositionWithinBounds(newTop));
  }

  private handleMouseUp(): void {
    if (!this.mouseDragState?.isDragging) return;

    this.mouseDragState.isDragging = false;
    this.onVisualStateChange(false);
  }

  // ================================================================
  // タッチドラッグ
  // ================================================================

  private initializeTouchDrag(): void {
    this.attachTouchEventListeners();
  }

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

  private removeTouchEventListeners(): void {
    this.scrollBarElement.removeEventListener('touchstart', this.boundTouchStart);
    this.scrollBarElement.removeEventListener('touchmove', this.boundTouchMove);
    this.scrollBarElement.removeEventListener('touchend', this.boundTouchEnd);
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    this.isTouchDragging = true;
    this.touchStartY = e.touches[0].clientY;
    this.touchStartTop = this.getCurrentScrollBarTop();

    this.onVisualStateChange(true);
  }

  private handleTouchMove(e: TouchEvent): void {
    if (!this.isTouchDragging) return;
    e.preventDefault();

    const deltaY = e.touches[0].clientY - this.touchStartY;
    const newTop = this.touchStartTop + deltaY;

    this.onDragCallback(this.constrainPositionWithinBounds(newTop));
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (!this.isTouchDragging) return;
    e.preventDefault();

    this.isTouchDragging = false;
    this.onVisualStateChange(false);
  }

  // ================================================================
  // 座標管理
  // ================================================================

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
