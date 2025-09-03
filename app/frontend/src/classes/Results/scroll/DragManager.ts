import { DragState } from '../../../types';

/**
 * ドラッグ機能を管理するクラス
 */
export class DragManager {
  private _mouseDragState: DragState | undefined;
  private _isTouchDragging: boolean = false;
  private _touchStartY: number = 0;
  private _touchStartTop: number = 0;

  // プライベートプロパティ（直接アクセス用）
  private readonly _scrollBarElement: HTMLElement;
  private readonly _container: HTMLElement;
  private readonly _onDragCallback: (_top: number) => void;
  private readonly _onVisualStateChange: (_isDragging: boolean) => void;

  constructor(
    scrollBarElement: HTMLElement,
    container: HTMLElement,
    onDragCallback: (_top: number) => void,
    onVisualStateChange: (_isDragging: boolean) => void
  ) {
    this._scrollBarElement = scrollBarElement;
    this._container = container;
    this._onDragCallback = onDragCallback;
    this._onVisualStateChange = onVisualStateChange;
  }

  /**
   * Get scrollbar element
   */
  getScrollBarElement(): HTMLElement {
    return this._scrollBarElement;
  }

  /**
   * Get container element
   */
  getContainer(): HTMLElement {
    return this._container;
  }

  /**
   * ドラッグ機能を初期化
   */
  initialize(): void {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      this._initializeMouseDrag();
    }
    this._initializeTouchDrag();
  }

  /**
   * マウスドラッグを初期化
   */
  private _initializeMouseDrag(): void {
    this._mouseDragState = {
      isDragging: false,
      startY: 0,
      startTop: 0,
    };

    this._scrollBarElement.style.cursor = 'grab';
    this._attachMouseEventListeners();
  }

  /**
   * マウスイベントリスナーを設定
   */
  private _attachMouseEventListeners(): void {
    this._scrollBarElement.addEventListener(
      'mousedown',
      this._onMouseDown.bind(this)
    );
    document.addEventListener('mousemove', this._onMouseMove.bind(this));
    document.addEventListener('mouseup', this._onMouseUp.bind(this));
  }

  /**
   * マウスダウンイベントハンドラ
   */
  private _onMouseDown(e: MouseEvent): void {
    if (!this._mouseDragState) return;

    e.preventDefault();
    this._mouseDragState.isDragging = true;
    this._mouseDragState.startY = e.clientY;
    this._mouseDragState.startTop =
      parseInt(this._scrollBarElement.style.top) || 0;

    this._onVisualStateChange(true);
  }

  /**
   * マウス移動イベントハンドラ
   */
  private _onMouseMove(e: MouseEvent): void {
    if (!this._mouseDragState?.isDragging) return;

    e.preventDefault();

    const deltaY = e.clientY - this._mouseDragState.startY;
    const newTop = this._mouseDragState.startTop + deltaY;
    const constrainedTop = this._constrainPositionWithinBounds(newTop);

    this._scrollBarElement.style.top = `${constrainedTop}px`;
    this._onDragCallback(constrainedTop);
  }

  /**
   * マウスアップイベントハンドラ
   */
  private _onMouseUp(): void {
    if (!this._mouseDragState?.isDragging) return;

    this._mouseDragState.isDragging = false;
    this._onVisualStateChange(false);
  }

  /**
   * タッチドラッグを初期化
   */
  private _initializeTouchDrag(): void {
    this._scrollBarElement.addEventListener(
      'touchstart',
      this._onTouchStart.bind(this),
      { passive: false }
    );
    this._scrollBarElement.addEventListener(
      'touchmove',
      this._onTouchMove.bind(this),
      { passive: false }
    );
    this._scrollBarElement.addEventListener(
      'touchend',
      this._onTouchEnd.bind(this),
      { passive: false }
    );
  }

  /**
   * タッチ開始イベントハンドラ
   */
  private _onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    this._isTouchDragging = true;
    this._touchStartY = e.touches[0].clientY;
    this._touchStartTop = parseInt(this._scrollBarElement.style.top) || 0;
    this._container.classList.add('-dragging');
    this._container.classList.add('-active');
  }

  /**
   * タッチ移動イベントハンドラ
   */
  private _onTouchMove(e: TouchEvent): void {
    if (!this._isTouchDragging) return;
    e.preventDefault();

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - this._touchStartY;
    const newTop = this._touchStartTop + deltaY;

    this._onDragCallback(newTop);
  }

  /**
   * タッチ終了イベントハンドラ
   */
  private _onTouchEnd(e: TouchEvent): void {
    if (!this._isTouchDragging) return;
    e.preventDefault();
    this._isTouchDragging = false;
    this._onVisualStateChange(false);
    this._container.classList.remove('-active');
  }

  /**
   * 位置を境界内に制限
   */
  private _constrainPositionWithinBounds(newTop: number): number {
    const maxTop =
      this._container.offsetHeight - this._scrollBarElement.offsetHeight;
    return Math.max(0, Math.min(newTop, maxTop));
  }
}
