import { ScrollCallbacks, TouchState, TouchGesture } from '../../types';
import { isTouchDevice } from '../../utils/deviceDetection';

// Selector constant for touch target elements (excluding links for accessibility)
const TOUCH_ELEMENTS_SELECTOR =
  '.tablecontainer > table > tbody > tr, .tablecontainer > table > tbody > td, .tablecontainer > table > tbody > td *:not(a)';

// Touch configuration constants
const TOUCH_CONFIG = {
  SCROLL_SENSITIVITY: 0.1, // Scroll sensitivity adjustment
  SCROLL_THRESHOLD: 10, // Scroll detection threshold (pixels)
  TAP_THRESHOLD: 300, // Tap detection threshold (milliseconds)
} as const;

/**
 * Touch event handler for table-based result interfaces
 *
 * This class provides comprehensive touch interaction management for tabular data displays.
 * It handles device detection, gesture recognition, and pointer event coordination to
 * deliver optimal user experience across different input methods.
 *
 * ## Key Features
 * - **Device Detection**: Automatically detects touch vs mouse/trackpad devices
 * - **Gesture Recognition**: Distinguishes between taps and scroll gestures
 * - **Pointer Event Management**: Controls element interactivity during touch operations
 * - **Scroll Integration**: Provides callbacks for scroll-based data virtualization
 *
 * ## Usage Pattern
 * 1. Create handler with table DOM elements
 * 2. Configure scroll callbacks for data updates
 * 3. Handler automatically manages touch vs mouse interactions
 */
export class ResultsViewTouchHandler {
  private _container: HTMLElement;
  private _tbody: HTMLElement;
  private _tablecontainer: HTMLElement;
  private _touchState: TouchState;
  private _scrollCallbacks: ScrollCallbacks = {};

  // Bound event handlers for proper cleanup
  private readonly _boundHandlers = {
    touchStart: this._handleTouchStart.bind(this),
    touchMove: this._handleTouchMove.bind(this),
    touchEnd: this._handleTouchEnd.bind(this),
    tapCompleted: this._handleTapCompleted.bind(this),
  };

  /**
   * Create a new touch handler for table interactions
   *
   * @param _container - Root container element containing the table
   * @param _tbody - Table body element where row interactions occur
   * @param _tablecontainer - Table container element for scroll area
   * ```
   */
  constructor(
    _container: HTMLElement,
    _tbody: HTMLElement,
    _tablecontainer: HTMLElement
  ) {
    this._container = _container;
    this._tbody = _tbody;
    this._tablecontainer = _tablecontainer;

    this._initializeTouchState();
    this._setupTouchEvents();
  }

  // ========================================
  // Configuration & Callbacks
  // ========================================

  /**
   * Configure scroll event callbacks
   *
   * Sets up callback functions that will be invoked during touch scroll operations.
   * These callbacks allow external components to respond to scroll events.
   *
   * @param callbacks - Object containing optional callback functions:
   *   - `onScrollStart`: Called when scroll gesture begins
   *   - `onScroll`: Called during scroll with deltaY movement
   *   - `onScrollEnd`: Called when scroll gesture ends
   *
   * @example
   * ```typescript
   * touchHandler.setScrollCallbacks({
   *   onScrollStart: () => console.log('Scroll started'),
   *   onScroll: (deltaY) => updateScrollPosition(deltaY),
   *   onScrollEnd: () => console.log('Scroll ended')
   * });
   * ```
   */
  setScrollCallbacks(callbacks: ScrollCallbacks): void {
    this._scrollCallbacks = { ...callbacks };
  }

  // ========================================
  // Pointer Events Control
  // ========================================

  /**
   * Control pointer-events CSS property for touch-sensitive elements
   *
   * ## Use Cases
   * - **Scroll Mode**: Disable interactions to prevent accidental taps during touch scrolling
   * - **Normal Mode**: Re-enable interactions after scroll gesture completes
   * - **Gesture Recognition**: Temporary disable during gesture analysis
   *
   * @param enabled - Whether to enable pointer-events
   *   - `true`: Elements can receive clicks/taps (normal interaction mode)
   *   - `false`: Elements ignore pointer events (scrolling mode)
   */
  setTouchElementsPointerEvents(enabled: boolean): void {
    // Update pointer-events for all touch-sensitive table elements (excluding links)
    const touchElements = this._container.querySelectorAll(
      TOUCH_ELEMENTS_SELECTOR
    );

    touchElements.forEach((element) => {
      (element as HTMLElement).style.pointerEvents = enabled ? 'auto' : 'none';
    });
  }

  // ================================================================
  // Lifecycle Management
  // ================================================================

  /**
   * Clean up all resources and event listeners
   * Call this method when the TouchHandler is no longer needed
   */
  destroy(): void {
    const touchElements = [this._tablecontainer, this._tbody];

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
    this._tbody.removeEventListener(
      'tapCompleted',
      this._boundHandlers.tapCompleted
    );

    // Clear callbacks
    this._scrollCallbacks = {};

    // Clear DOM references
    this._container = null!;
    this._tbody = null!;
    this._tablecontainer = null!;
  }

  // ========================================
  // Initialization & Setup
  // ========================================

  /**
   * Initialize touch state
   */
  private _initializeTouchState(): void {
    this._touchState = {
      startY: 0,
      startX: 0,
      startTime: 0,
      lastY: 0,
      lastX: 0,
      distance: 0,
      duration: 0,
      isScrolling: false,
    };
  }

  /**
   * Set up touch events
   */
  private _setupTouchEvents(): void {
    const touchElements = [this._tablecontainer, this._tbody];

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

    this._tbody.addEventListener(
      'tapCompleted',
      this._boundHandlers.tapCompleted
    );
  }

  // ========================================
  // Touch Event Handlers
  // ========================================

  /**
   * Handle touch start event
   * @param e - Touch event
   */
  private _handleTouchStart(e: TouchEvent): void {
    if (!this._isValidTouchTarget(e) || e.touches.length !== 1) {
      return;
    }

    this._resetTouchState();

    const touch = e.touches[0];
    this._touchState.startY = touch.clientY;
    this._touchState.startX = touch.clientX;
    this._touchState.lastY = touch.clientY;
    this._touchState.lastX = touch.clientX;
    this._touchState.startTime = Date.now();

    this.setTouchElementsPointerEvents(true);
  }

  /**
   * Handle touch move event
   * @param e - Touch event
   */
  private _handleTouchMove(e: TouchEvent): void {
    if (!this._isValidTouchTarget(e) || e.touches.length !== 1) {
      return;
    }

    const touch = e.touches[0];
    const gesture = this._analyzeTouchGesture(touch.clientY, touch.clientX);

    this._touchState.distance = Math.sqrt(
      gesture.deltaX * gesture.deltaX + gesture.deltaY * gesture.deltaY
    );

    if (gesture.isScroll) {
      if (!this._touchState.isScrolling) {
        this._touchState.isScrolling = true;
        this.setTouchElementsPointerEvents(false);
        this._scrollCallbacks.onScrollStart?.();
      }

      this._touchState.lastY = touch.clientY;
      this._scrollCallbacks.onScroll?.(
        -gesture.deltaY * TOUCH_CONFIG.SCROLL_SENSITIVITY
      );
    }
  }

  /**
   * Handle touch end event
   * @param e - Touch event
   */
  private _handleTouchEnd(_e: TouchEvent): void {
    this._touchState.duration = Date.now() - this._touchState.startTime;

    const isTap =
      this._touchState.distance < TOUCH_CONFIG.SCROLL_THRESHOLD &&
      this._touchState.duration < TOUCH_CONFIG.TAP_THRESHOLD;

    if (isTap) {
      this.setTouchElementsPointerEvents(true);
    } else if (this._touchState.isScrolling) {
      this._touchState.isScrolling = false;
      this.setTouchElementsPointerEvents(false);
      this._scrollCallbacks.onScrollEnd?.();
    } else {
      this.setTouchElementsPointerEvents(true);
    }

    this._resetTouchState();
  }

  /**
   * Handle tap completion
   * @param e - Custom event
   */
  private _handleTapCompleted(_e: Event): void {
    if (!isTouchDevice()) return;
    this.setTouchElementsPointerEvents(false);
  }

  // ========================================
  // Gesture Analysis
  // ========================================

  /**
   * Analyze touch gesture to determine user intention (tap vs scroll)
   *
   * This method calculates the distance and direction of touch movement
   * to distinguish between different types of gestures:
   * - **Tap**: Short duration, minimal movement
   * - **Scroll**: Vertical movement exceeding threshold
   *
   * @param currentY - Current Y coordinate of touch point
   * @param currentX - Current X coordinate of touch point
   * @returns Gesture analysis result containing tap/scroll flags and deltas
   *
   * @example
   * ```typescript
   * const gesture = this._analyzeTouchGesture(touchY, touchX);
   * if (gesture.isTap) {
   *   // Handle tap interaction
   * } else if (gesture.isScroll) {
   *   // Handle scroll with gesture.deltaY
   * }
   * ```
   */
  private _analyzeTouchGesture(
    currentY: number,
    currentX: number
  ): TouchGesture {
    const deltaY = currentY - this._touchState.startY;
    const deltaX = currentX - this._touchState.startX;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    const isVerticalScroll = Math.abs(deltaY) > Math.abs(deltaX);
    const exceedsThreshold = distance > TOUCH_CONFIG.SCROLL_THRESHOLD;
    const isScroll = isVerticalScroll && exceedsThreshold;

    const duration = Date.now() - this._touchState.startTime;
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

  // ========================================
  // Touch Validation & State Management
  // ========================================

  /**
   * Check if touch is within valid range
   */
  private _isValidTouchTarget(e: TouchEvent): boolean {
    return (
      (this._container.contains(e.target as Node) ||
        this._container.contains(e.currentTarget as Node)) &&
      (e.currentTarget === this._tablecontainer ||
        e.currentTarget === this._tbody)
    );
  }

  /**
   * Reset touch state
   */
  private _resetTouchState(): void {
    this._touchState.isScrolling = false;
    this._touchState.distance = 0;
    this._touchState.startY = 0;
    this._touchState.startX = 0;
    this._touchState.lastY = 0;
    this._touchState.lastX = 0;
    this._touchState.startTime = 0;
    this._touchState.duration = 0;
  }
}
