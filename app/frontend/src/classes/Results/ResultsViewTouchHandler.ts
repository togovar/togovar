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
  private _touchState: TouchState = {
    startY: 0,
    startX: 0,
    startTime: 0,
    lastY: 0,
    lastX: 0,
    distance: 0,
    duration: 0,
    isScrolling: false,
  };
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
   */
  constructor(
    _container: HTMLElement,
    _tbody: HTMLElement,
    _tablecontainer: HTMLElement
  ) {
    this._container = _container;
    this._tbody = _tbody;
    this._tablecontainer = _tablecontainer;

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
   * Control whether table elements can be touched/interacted with
   *
   * ## Use Cases
   * - **Scroll Mode**: Make elements untouchable to prevent accidental taps during scrolling
   * - **Normal Mode**: Make elements touchable after scroll gesture completes
   * - **Gesture Recognition**: Temporarily make elements untouchable during gesture analysis
   *
   * @param enabled - Whether elements should be interactable
   *   - `true`: Elements can be touched/clicked (normal interaction mode)
   *   - `false`: Elements cannot be touched (scrolling mode)
   */
  setElementsInteractable(enabled: boolean): void {
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
      element.removeEventListener('touchstart', this._boundHandlers.touchStart);
      element.removeEventListener('touchmove', this._boundHandlers.touchMove);
      element.removeEventListener('touchend', this._boundHandlers.touchEnd);
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
   * Set up touch events
   *
   * ## Event Configuration
   * - **passive: true**: Optimizes performance since we don't call preventDefault()
   *   This allows the browser to perform scroll optimizations without waiting
   *   to see if preventDefault() will be called.
   */
  private _setupTouchEvents(): void {
    const touchElements = [this._tablecontainer, this._tbody];

    touchElements.forEach((element) => {
      element.addEventListener('touchstart', this._boundHandlers.touchStart, {
        passive: true,
      });
      element.addEventListener('touchmove', this._boundHandlers.touchMove, {
        passive: true,
      });
      element.addEventListener('touchend', this._boundHandlers.touchEnd, {
        passive: true,
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
   * Handle touch start event - Initialize touch tracking
   *
   * This method is called when a user first touches the screen within the table area.
   * It initializes the touch state tracking system and enables pointer events for
   * normal interaction mode.
   *
   * @param e - TouchEvent containing touch point information
   */
  private _handleTouchStart(e: TouchEvent): void {
    // Verify the touch is on a valid target with single finger
    if (!this._isValidTouchTarget(e) || e.touches.length !== 1) {
      return;
    }

    // Clear any previous touch state data
    this._resetTouchState();

    // Record initial touch positions and timestamp
    const touch = e.touches[0];
    this._touchState.startY = touch.clientY;
    this._touchState.startX = touch.clientX;
    this._touchState.lastY = touch.clientY;
    this._touchState.lastX = touch.clientX;
    this._touchState.startTime = Date.now();

    // Enable pointer events for touch elements
    this.setElementsInteractable(true);
  }

  /**
   * Handle touch move event - Process ongoing touch movement
   *
   * This method continuously tracks finger movement and determines user intent
   * (scrolling vs accidental movement). It implements gesture recognition logic
   * to distinguish between intentional scrolling and minor finger adjustments.
   *
   * @param e - TouchEvent containing current touch position
   */
  private _handleTouchMove(e: TouchEvent): void {
    if (!this._isValidTouchTarget(e) || e.touches.length !== 1) {
      return;
    }

    const touch = e.touches[0];
    const gesture = this._analyzeTouchGesture(touch.clientY, touch.clientX);

    // Update distance tracking
    this._touchState.distance = gesture.distance;

    if (gesture.isScroll) {
      // Handle scroll gesture initiation
      if (!this._touchState.isScrolling) {
        this._touchState.isScrolling = true;
        this.setElementsInteractable(false);
        this._scrollCallbacks.onScrollStart?.();
      }

      // Continue scroll gesture
      this._touchState.lastY = touch.clientY;
      this._scrollCallbacks.onScroll?.(
        -gesture.deltaY * TOUCH_CONFIG.SCROLL_SENSITIVITY
      );
    }
  }

  /**
   * Handle touch end event - Finalize gesture and restore interaction state
   *
   * This method determines the final classification of the completed touch gesture
   * and restores appropriate interaction state. It handles three scenarios:
   * successful taps, completed scrolls, and cancelled gestures.
   *
   * @param _e - TouchEvent (unused but required for event handler signature)
   */
  private _handleTouchEnd(_e: TouchEvent): void {
    // Calculate total gesture duration
    this._touchState.duration = Date.now() - this._touchState.startTime;

    // Classify completed gesture
    const isTap =
      this._touchState.distance < TOUCH_CONFIG.SCROLL_THRESHOLD &&
      this._touchState.duration < TOUCH_CONFIG.TAP_THRESHOLD;

    // Handle gesture completion based on classification
    if (isTap) {
      // Successful tap - enable interactions for click processing
      this.setElementsInteractable(true);
    } else if (this._touchState.isScrolling) {
      // Completed scroll - keep interactions disabled, notify completion
      this._touchState.isScrolling = false;
      this.setElementsInteractable(false);
      this._scrollCallbacks.onScrollEnd?.();
    } else {
      // Cancelled or unrecognized gesture - enable interactions (safe fallback)
      this.setElementsInteractable(true);
    }

    // Clean up for next gesture
    this._resetTouchState();
  }

  /**
   * Handle tap completion event - Restore scroll-optimized interaction state
   *
   * This method is triggered after a successful tap gesture has been processed
   * by the UI system. For touch devices, it restores the scroll-optimized state
   * by disabling pointer events, preventing accidental interactions during
   * subsequent scroll gestures.
   *
   * ## Touch Device Behavior
   * - **Touch Devices**: Disable interactions to prepare for scrolling
   * - **Non-Touch Devices**: No action (precise pointer control available)
   *
   * @param _e - Custom Event (unused but required for event handler signature)
   */
  private _handleTapCompleted(_e: Event): void {
    if (!isTouchDevice()) return;
    this.setElementsInteractable(false);
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
   * @returns Gesture analysis result containing:
   *   - `isTap`: Whether gesture qualifies as a tap
   *   - `isScroll`: Whether gesture qualifies as a scroll
   *   - `deltaY`, `deltaX`: Movement deltas from start position
   *   - `distance`: Euclidean distance (calculated once for efficiency)
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
      distance,
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
