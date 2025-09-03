import {
  DragState,
  DragManagerConfig,
  TouchEventOptions,
} from '../../../types';

/**
 * Class that manages drag functionality with support for both mouse and touch interactions
 */
export class DragManager {
  // Constants
  private static readonly CURSOR_GRAB = 'grab';
  private static readonly CSS_CLASS_DRAGGING = '-dragging';
  private static readonly CSS_CLASS_ACTIVE = '-active';
  private static readonly TOUCH_EVENT_OPTIONS: TouchEventOptions = {
    passive: false,
  };

  // State management
  private _mouseDragState: DragState | undefined;
  private _isTouchDragging: boolean = false;
  private _touchStartY: number = 0;
  private _touchStartTop: number = 0;

  // DOM elements and callbacks
  private readonly _scrollBarElement: HTMLElement;
  private readonly _container: HTMLElement;
  private readonly _onDragCallback: (_top: number) => void;
  private readonly _onVisualStateChange: (_isDragging: boolean) => void;

  // Event handlers (bound methods for proper cleanup)
  private readonly _boundMouseDown: (_e: MouseEvent) => void;
  private readonly _boundMouseMove: (_e: MouseEvent) => void;
  private readonly _boundMouseUp: () => void;
  private readonly _boundTouchStart: (_e: TouchEvent) => void;
  private readonly _boundTouchMove: (_e: TouchEvent) => void;
  private readonly _boundTouchEnd: (_e: TouchEvent) => void;

  constructor(config: DragManagerConfig) {
    this._scrollBarElement = config.scrollBarElement;
    this._container = config.container;
    this._onDragCallback = config.onDragCallback;
    this._onVisualStateChange = config.onVisualStateChange;

    // Bind event handlers once for better performance and cleanup
    this._boundMouseDown = this._onMouseDown.bind(this);
    this._boundMouseMove = this._onMouseMove.bind(this);
    this._boundMouseUp = this._onMouseUp.bind(this);
    this._boundTouchStart = this._onTouchStart.bind(this);
    this._boundTouchMove = this._onTouchMove.bind(this);
    this._boundTouchEnd = this._onTouchEnd.bind(this);
  }

  // ========================================
  // Lifecycle Management
  // ========================================

  /**
   * Initialize drag functionality by setting up event listeners
   * Automatically detects device capabilities and configures appropriate interaction methods
   */
  initialize(): void {
    if (this._supportsMouseInteraction()) {
      this._initializeMouseDrag();
    }
    this._initializeTouchDrag();
  }

  /**
   * Clean up all event listeners and reset internal state
   * Call this method when the component is no longer needed to prevent memory leaks
   */
  destroy(): void {
    this._removeMouseEventListeners();
    this._removeTouchEventListeners();
    this._resetState();
  }

  // ========================================
  // Device Detection Methods
  // ========================================

  /**
   * Check if device supports mouse interaction
   * Uses CSS Media Queries to detect if the device has:
   * - hover capability (can hover over elements)
   * - fine pointer precision (mouse/trackpad vs finger touch)
   *
   * @returns true for desktop/laptop with mouse/trackpad, false for touch-only devices
   * @example
   * Desktop with mouse: true
   * Laptop with trackpad: true
   * Tablet: false
   * Smartphone: false
   */
  private _supportsMouseInteraction(): boolean {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  // ========================================
  // Mouse Drag Implementation
  // ========================================

  /**
   * Initialize mouse drag functionality
   */
  private _initializeMouseDrag(): void {
    this._mouseDragState = {
      isDragging: false,
      startY: 0,
      startTop: 0,
    };

    this._scrollBarElement.style.cursor = DragManager.CURSOR_GRAB;
    this._attachMouseEventListeners();
  }

  /**
   * Attach mouse event listeners
   */
  private _attachMouseEventListeners(): void {
    this._scrollBarElement.addEventListener('mousedown', this._boundMouseDown);
    document.addEventListener('mousemove', this._boundMouseMove);
    document.addEventListener('mouseup', this._boundMouseUp);
  }

  /**
   * Remove mouse event listeners safely
   * This method is safe to call multiple times
   */
  private _removeMouseEventListeners(): void {
    // Remove event listener from scrollbar element
    this._scrollBarElement.removeEventListener(
      'mousedown',
      this._boundMouseDown
    );

    // Remove document-level event listeners (important)
    document.removeEventListener('mousemove', this._boundMouseMove);
    document.removeEventListener('mouseup', this._boundMouseUp);
  }

  // ========================================
  // Mouse Event Handlers
  // ========================================

  /**
   * Mouse down event handler
   */
  private _onMouseDown(e: MouseEvent): void {
    if (!this._mouseDragState) return;

    e.preventDefault();
    this._mouseDragState.isDragging = true;
    this._mouseDragState.startY = e.clientY;
    this._mouseDragState.startTop = this._getCurrentScrollBarTop();

    this._onVisualStateChange(true);
  }

  /**
   * Mouse move event handler
   */
  private _onMouseMove(e: MouseEvent): void {
    if (!this._mouseDragState?.isDragging) return;

    e.preventDefault();

    const deltaY = e.clientY - this._mouseDragState.startY;
    const newTop = this._mouseDragState.startTop + deltaY;
    const constrainedTop = this._constrainPositionWithinBounds(newTop);

    this._updateScrollBarPosition(constrainedTop);
    this._onDragCallback(constrainedTop);
  }

  /**
   * Mouse up event handler
   */
  private _onMouseUp(): void {
    if (!this._mouseDragState?.isDragging) return;

    this._mouseDragState.isDragging = false;
    this._onVisualStateChange(false);
  }

  // ========================================
  // Touch Drag Implementation
  // ========================================

  /**
   * Initialize touch drag functionality
   */
  private _initializeTouchDrag(): void {
    this._attachTouchEventListeners();
  }

  /**
   * Attach touch event listeners
   */
  private _attachTouchEventListeners(): void {
    this._scrollBarElement.addEventListener(
      'touchstart',
      this._boundTouchStart,
      DragManager.TOUCH_EVENT_OPTIONS
    );
    this._scrollBarElement.addEventListener(
      'touchmove',
      this._boundTouchMove,
      DragManager.TOUCH_EVENT_OPTIONS
    );
    this._scrollBarElement.addEventListener(
      'touchend',
      this._boundTouchEnd,
      DragManager.TOUCH_EVENT_OPTIONS
    );
  }

  /**
   * Remove touch event listeners
   */
  private _removeTouchEventListeners(): void {
    this._scrollBarElement.removeEventListener(
      'touchstart',
      this._boundTouchStart
    );
    this._scrollBarElement.removeEventListener(
      'touchmove',
      this._boundTouchMove
    );
    this._scrollBarElement.removeEventListener('touchend', this._boundTouchEnd);
  }

  // ========================================
  // Touch Event Handlers
  // ========================================

  /**
   * Touch start event handler
   */
  private _onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    this._isTouchDragging = true;
    this._touchStartY = e.touches[0].clientY;
    this._touchStartTop = this._getCurrentScrollBarTop();

    this._addDragClasses();
    this._onVisualStateChange(true);
  }

  /**
   * Touch move event handler
   */
  private _onTouchMove(e: TouchEvent): void {
    if (!this._isTouchDragging) return;
    e.preventDefault();

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - this._touchStartY;
    const newTop = this._touchStartTop + deltaY;
    const constrainedTop = this._constrainPositionWithinBounds(newTop);

    this._onDragCallback(constrainedTop);
  }

  /**
   * Touch end event handler
   */
  private _onTouchEnd(e: TouchEvent): void {
    if (!this._isTouchDragging) return;
    e.preventDefault();

    this._isTouchDragging = false;
    this._onVisualStateChange(false);
    this._removeDragClasses();
  }

  // ========================================
  // Helper Methods
  // ========================================

  /**
   * Get current scrollbar top position
   */
  private _getCurrentScrollBarTop(): number {
    return parseInt(this._scrollBarElement.style.top) || 0;
  }

  /**
   * Update scrollbar position
   */
  private _updateScrollBarPosition(top: number): void {
    this._scrollBarElement.style.top = `${top}px`;
  }

  /**
   * Add drag-related CSS classes
   */
  private _addDragClasses(): void {
    this._container.classList.add(DragManager.CSS_CLASS_DRAGGING);
    this._container.classList.add(DragManager.CSS_CLASS_ACTIVE);
  }

  /**
   * Remove drag-related CSS classes
   */
  private _removeDragClasses(): void {
    this._container.classList.remove(DragManager.CSS_CLASS_DRAGGING);
    this._container.classList.remove(DragManager.CSS_CLASS_ACTIVE);
  }

  /**
   * Constrain position within bounds
   */
  private _constrainPositionWithinBounds(newTop: number): number {
    const maxTop =
      this._container.offsetHeight - this._scrollBarElement.offsetHeight;
    return Math.max(0, Math.min(newTop, maxTop));
  }

  /**
   * Reset internal state without affecting DOM elements
   * This method only clears internal tracking variables
   */
  private _resetState(): void {
    if (this._mouseDragState) {
      this._mouseDragState.isDragging = false;
      this._mouseDragState = undefined;
    }
    this._isTouchDragging = false;
    this._touchStartY = 0;
    this._touchStartTop = 0;
  }
}
