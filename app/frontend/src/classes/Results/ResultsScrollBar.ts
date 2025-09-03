import { storeManager } from '../../store/StoreManager';
import { TR_HEIGHT } from '../../global.js';
import {
  DragState,
  DragEventUI,
  ScrollCalculation,
  ScrollBarCalculation,
  ScrollBounds,
} from '../../types';

// ================================================================
// CONSTANTS
// ================================================================

const RELEASE_DURATION = 2000;
const MIN_SCROLLBAR_HEIGHT = 30;

// ================================================================
// MAIN CLASS
// ================================================================

/**
 * Results専用スクロールバーコンポーネント
 *
 * ## Features
 * - Results表示に特化したスクロール処理
 * - マウス・タッチドラッグ対応
 * - 自動位置計算とフィードバック
 * - パフォーマンス最適化済み
 *
 * ## Usage
 * ```typescript
 * const scrollbar = new ResultsScrollBar(containerElement);
 * ```
 */
export default class ResultsScrollBar {
  // ================================================================
  // PROPERTIES
  // ================================================================

  /** Container element for the scrollbar */
  private readonly container: HTMLElement;
  /** Main scrollbar element */
  private readonly scrollBarElement: HTMLElement;
  /** Display element for current position */
  private readonly positionDisplay: HTMLElement;
  /** Display element for total count */
  private readonly totalDisplay: HTMLElement;

  /** Timeout ID for delayed release of visual states */
  private releaseTimeoutId: number | undefined;
  /** State object for mouse drag operations */
  private mouseDragState: DragState | undefined;
  /** Flag indicating if touch dragging is active */
  private isTouchDragging: boolean = false;
  /** Initial Y coordinate for touch drag */
  private touchStartY: number = 0;
  /** Initial top position for touch drag */
  private touchStartTop: number = 0;
  /** Last scroll position for delta calculations */
  private lastScrollPosition: number = 0;

  // ================================================================
  // CONSTRUCTOR & INITIALIZATION
  // ================================================================

  /**
   * Creates a new ResultsScrollBar instance
   * @param containerElement - The container element where the scrollbar will be inserted
   */
  constructor(containerElement: HTMLElement) {
    this.container = containerElement;

    this._createScrollBarHTML();

    const elements = this._getRequiredElements();
    this.scrollBarElement = elements.scrollBar;
    this.positionDisplay = elements.position;
    this.totalDisplay = elements.total;

    this._bindStoreEvents();
    this._initializeDragFunctionality();
  }

  /**
   * Creates the HTML structure for the scrollbar
   */
  private _createScrollBarHTML(): void {
    this.container.insertAdjacentHTML(
      'beforeend',
      `
      <div class="bar">
        <div class="indicator">
          <span class="position">1</span>
          <span class="total"></span>
        </div>
      </div>
      `
    );
  }

  /**
   * Gets and validates required DOM elements
   */
  private _getRequiredElements() {
    const scrollBar = this.container.querySelector('.bar') as HTMLElement;
    if (!scrollBar) {
      throw new Error('ScrollBar element (.bar) not found');
    }

    const position = scrollBar.querySelector('.position') as HTMLElement;
    const total = scrollBar.querySelector('.total') as HTMLElement;
    if (!position || !total) {
      throw new Error(
        'Required indicator elements (.position, .total) not found'
      );
    }

    return { scrollBar, position, total };
  }

  /**
   * Binds this component to store events
   */
  private _bindStoreEvents(): void {
    storeManager.bind('offset', this);
    storeManager.bind('numberOfRecords', this);
    storeManager.bind('rowCount', this);
  }

  /**
   * Initializes drag functionality based on device capabilities
   */
  private _initializeDragFunctionality(): void {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      this._initializeMouseDrag();
    }
    this._initializeTouchDrag();
  }

  // ================================================================
  // PUBLIC API - Store Event Handlers
  // ================================================================

  /**
   * Handles drag operation and updates the scroll position in store
   * @param e - The original event (can be null for programmatic calls)
   * @param ui - Object containing the drag position information
   */
  onDrag(e: Event | null, ui: DragEventUI): void {
    const rowCount = storeManager.getData('rowCount') as number;
    const numberOfRecords = storeManager.getData('numberOfRecords') as number;
    const availableHeight =
      rowCount * TR_HEIGHT - this.scrollBarElement.offsetHeight * 0;
    const offsetRate = ui.position.top / availableHeight;

    let offset = Math.ceil(offsetRate * numberOfRecords);
    offset = offset < 0 ? 0 : offset;
    offset =
      offset + rowCount > numberOfRecords ? numberOfRecords - rowCount : offset;

    storeManager.setData('offset', offset);
    this._scheduleVisualStateRelease();
  }

  /**
   * Updates the displayed position when the offset changes
   * @param offset - The new offset value (0-based index)
   */
  offset(offset: number): void {
    this.positionDisplay.textContent = (offset + 1).toString();
    this._updateScrollBarAppearance();

    // Maintain active state on touch devices
    if (
      window.matchMedia('(hover: none) and (pointer: coarse)').matches &&
      this.container.classList.contains('-active')
    ) {
      return;
    }
  }

  /**
   * Updates the total number of records displayed
   * @param numberOfRecords - The total count of records
   */
  numberOfRecords(numberOfRecords: number): void {
    this.totalDisplay.textContent = numberOfRecords.toLocaleString();
    this._updateScrollBarAppearance();
  }

  /**
   * Handles row count changes and triggers a UI update
   */
  rowCount(): void {
    this._updateScrollBarAppearance();
  }

  // ================================================================
  // PUBLIC API - Results-specific methods
  // ================================================================

  /**
   * Deactivate the scrollbar visual state
   */
  deactivate(): void {
    this.container.classList.remove('-active');
  }

  /**
   * Initialize scrollbar position
   */
  initializePosition(): void {
    this.container.classList.add('-active');
  }

  /**
   * Handle scroll with scrollbar feedback (for touch events)
   * @param deltaY - Y delta value
   * @param touchStartOffset - Starting offset when touch began
   */
  handleScrollWithFeedback(deltaY: number, touchStartOffset: number): void {
    const newOffset = this._calculateTouchScrollOffset(
      deltaY,
      touchStartOffset
    );
    const boundedOffset = this._clampOffsetToValidRange(newOffset);

    this.lastScrollPosition = boundedOffset * TR_HEIGHT;
    storeManager.setData('offset', boundedOffset);
    this.updateDirectly(boundedOffset);
  }

  /**
   * Handle simple scroll (for wheel events)
   * @param deltaY - Y delta value
   */
  handleScroll(deltaY: number): void {
    const calculation = this._calculateScrollPosition(deltaY);

    if (calculation.newScrollPosition === this.lastScrollPosition) {
      return;
    }

    this.lastScrollPosition = calculation.newScrollPosition;
    const offset = this._calculateOffsetFromScroll(this.lastScrollPosition);
    storeManager.setData('offset', offset);
  }

  /**
   * Update scrollbar directly with specific offset
   * @param offset - Offset value
   */
  updateDirectly(offset: number): void {
    const calculation = this._calculateScrollBarPosition(offset);
    this._applyScrollBarStyles(this.scrollBarElement, calculation, offset);
  }

  // ================================================================
  // PRIVATE - Visual Updates
  // ================================================================

  /**
   * Updates the scrollbar appearance based on current data store values
   */
  private _updateScrollBarAppearance(): void {
    const offset = storeManager.getData('offset') as number;
    const rowCount = storeManager.getData('rowCount') as number;
    const numberOfRecords = storeManager.getData('numberOfRecords') as number;

    const totalHeight = numberOfRecords * TR_HEIGHT;
    const offsetHeight = offset * TR_HEIGHT;
    const displayHeight = rowCount * TR_HEIGHT;
    const displayRate = displayHeight / totalHeight;

    let barHeight = Math.ceil(displayHeight * displayRate);
    barHeight =
      barHeight < MIN_SCROLLBAR_HEIGHT ? MIN_SCROLLBAR_HEIGHT : barHeight;

    const availableHeight = displayHeight - barHeight * 0;
    const availableRate = availableHeight / totalHeight;
    const barTop = Math.ceil(offsetHeight * availableRate);

    this.scrollBarElement.style.height = `${barHeight}px`;
    this.scrollBarElement.style.top = `${barTop}px`;
    this._scheduleVisualStateRelease();

    if (rowCount === 0 || numberOfRecords === rowCount) {
      this.scrollBarElement.classList.add('-disabled');
    } else {
      this.scrollBarElement.classList.remove('-disabled');
    }
  }

  /**
   * Schedules delayed release of visual dragging state
   */
  private _scheduleVisualStateRelease(): void {
    if (this.releaseTimeoutId !== undefined) {
      window.clearTimeout(this.releaseTimeoutId);
    }
    this.releaseTimeoutId = window.setTimeout(
      this._releaseVisualState.bind(this),
      RELEASE_DURATION
    );
    this.container.classList.add('-dragging');
  }

  /**
   * Removes the dragging visual state from the scrollbar
   */
  private _releaseVisualState(): void {
    this.container.classList.remove('-dragging');
  }

  // ================================================================
  // PRIVATE - Scroll Calculations (integrated from ScrollHandler)
  // ================================================================

  /**
   * Calculate scroll position
   */
  private _calculateScrollPosition(deltaY: number): ScrollCalculation {
    const numberOfRecords = storeManager.getData('numberOfRecords') as number;
    const rowCount = storeManager.getData('rowCount') as number;

    const totalHeight = numberOfRecords * TR_HEIGHT;
    let availableScrollY = totalHeight - rowCount * TR_HEIGHT;
    availableScrollY = Math.max(0, availableScrollY);

    const newScrollPosition = this._clampScrollPosition(
      this.lastScrollPosition + deltaY,
      { min: 0, max: availableScrollY }
    );

    return {
      totalHeight,
      availableScrollY,
      newScrollPosition,
    };
  }

  /**
   * Clamp scroll position within bounds
   */
  private _clampScrollPosition(value: number, bounds: ScrollBounds): number {
    return Math.max(bounds.min, Math.min(value, bounds.max));
  }

  /**
   * Calculate offset from scroll position
   */
  private _calculateOffsetFromScroll(scrollPosition: number): number {
    return Math.ceil(scrollPosition / TR_HEIGHT);
  }

  /**
   * Calculate touch scroll offset
   */
  private _calculateTouchScrollOffset(
    deltaY: number,
    touchStartOffset: number
  ): number {
    const rowCount = storeManager.getData('rowCount') as number;
    const numberOfRecords = storeManager.getData('numberOfRecords') as number;

    const availableHeight = rowCount * TR_HEIGHT;
    const offsetRate = deltaY / availableHeight;

    return Math.ceil(offsetRate * numberOfRecords) + touchStartOffset;
  }

  /**
   * Clamp offset to valid range
   */
  private _clampOffsetToValidRange(offset: number): number {
    const rowCount = storeManager.getData('rowCount') as number;
    const numberOfRecords = storeManager.getData('numberOfRecords') as number;

    const minOffset = 0;
    const maxOffset = Math.max(0, numberOfRecords - rowCount);

    return Math.max(minOffset, Math.min(offset, maxOffset));
  }

  /**
   * Calculate scrollbar position and size
   */
  private _calculateScrollBarPosition(offset: number): ScrollBarCalculation {
    const rowCount = storeManager.getData('rowCount') as number;
    const numberOfRecords = storeManager.getData('numberOfRecords') as number;

    const totalHeight = numberOfRecords * TR_HEIGHT;
    const displayHeight = rowCount * TR_HEIGHT;
    const displayRate = displayHeight / totalHeight;

    let barHeight = Math.ceil(displayHeight * displayRate);
    barHeight = Math.max(barHeight, MIN_SCROLLBAR_HEIGHT);

    const availableHeight = displayHeight - barHeight;
    const availableRate = availableHeight / totalHeight;
    const barTop = Math.ceil(offset * TR_HEIGHT * availableRate);

    return {
      barHeight,
      barTop,
      displayRate,
    };
  }

  /**
   * Apply scrollbar styles
   */
  private _applyScrollBarStyles(
    scrollBar: HTMLElement,
    calculation: ScrollBarCalculation,
    offset: number
  ): void {
    // Bar styles
    scrollBar.style.height = `${calculation.barHeight}px`;
    scrollBar.style.top = `${calculation.barTop}px`;

    // Update position display
    this._updatePositionDisplay(scrollBar, offset);

    // Maintain active state
    this.container.classList.add('-active');
  }

  /**
   * Update position display
   */
  private _updatePositionDisplay(bar: HTMLElement, offset: number): void {
    const position = bar.querySelector('.position') as HTMLElement;
    if (position) {
      position.textContent = String(offset + 1);
    }
  }

  // ================================================================
  // PRIVATE - Mouse Drag Implementation
  // ================================================================

  /**
   * Initializes mouse drag functionality for desktop devices
   */
  private _initializeMouseDrag(): void {
    this.mouseDragState = {
      isDragging: false,
      startY: 0,
      startTop: 0,
    };

    this._setInitialCursorStyle();
    this._attachMouseEventListeners();
  }

  /**
   * Sets the initial cursor style for the scrollbar
   */
  private _setInitialCursorStyle(): void {
    this.scrollBarElement.style.cursor = 'grab';
  }

  /**
   * Attaches mouse event listeners for drag functionality
   */
  private _attachMouseEventListeners(): void {
    this.scrollBarElement.addEventListener(
      'mousedown',
      this._onMouseDown.bind(this)
    );
    document.addEventListener('mousemove', this._onMouseMove.bind(this));
    document.addEventListener('mouseup', this._onMouseUp.bind(this));
  }

  /**
   * Handles mouse down events to start dragging
   */
  private _onMouseDown(e: MouseEvent): void {
    if (!this.mouseDragState) return;

    e.preventDefault();
    this.mouseDragState.isDragging = true;
    this.mouseDragState.startY = e.clientY;
    this.mouseDragState.startTop =
      parseInt(this.scrollBarElement.style.top) || 0;

    this._setDraggingCursorStyle(true);
  }

  /**
   * Handles mouse move events during dragging
   */
  private _onMouseMove(e: MouseEvent): void {
    if (!this.mouseDragState?.isDragging) return;

    e.preventDefault();

    const deltaY = e.clientY - this.mouseDragState.startY;
    const newTop = this.mouseDragState.startTop + deltaY;
    const constrainedTop = this._constrainPositionWithinBounds(newTop);

    this._setScrollBarPosition(constrainedTop);
    this._triggerDragEvent(constrainedTop);
  }

  /**
   * Handles mouse up events to end dragging
   */
  private _onMouseUp(): void {
    if (!this.mouseDragState?.isDragging) return;

    this.mouseDragState.isDragging = false;
    this._setDraggingCursorStyle(false);
    this._scheduleVisualStateRelease();
  }

  // ================================================================
  // PRIVATE - Touch Drag Implementation
  // ================================================================

  /**
   * Initializes touch event listeners for mobile device support
   */
  private _initializeTouchDrag(): void {
    this.scrollBarElement.addEventListener(
      'touchstart',
      this._onTouchStart.bind(this),
      {
        passive: false,
      }
    );
    this.scrollBarElement.addEventListener(
      'touchmove',
      this._onTouchMove.bind(this),
      {
        passive: false,
      }
    );
    this.scrollBarElement.addEventListener(
      'touchend',
      this._onTouchEnd.bind(this),
      {
        passive: false,
      }
    );
  }

  /**
   * Handles touch start events to begin touch dragging
   */
  private _onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    this.isTouchDragging = true;
    this.touchStartY = e.touches[0].clientY;
    this.touchStartTop = parseInt(this.scrollBarElement.style.top) || 0;
    this.container.classList.add('-dragging');
    this.container.classList.add('-active');
  }

  /**
   * Handles touch move events during touch dragging
   */
  private _onTouchMove(e: TouchEvent): void {
    if (!this.isTouchDragging) return;
    e.preventDefault();

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - this.touchStartY;
    const newTop = this.touchStartTop + deltaY;

    this._triggerDragEvent(newTop);
  }

  /**
   * Handles touch end events to finish touch dragging
   */
  private _onTouchEnd(e: TouchEvent): void {
    if (!this.isTouchDragging) return;
    e.preventDefault();
    this.isTouchDragging = false;
    this._scheduleVisualStateRelease();
    this.container.classList.remove('-active');
  }

  // ================================================================
  // PRIVATE - Helper Methods
  // ================================================================

  /**
   * Constrains position within the container bounds
   */
  private _constrainPositionWithinBounds(newTop: number): number {
    const maxTop =
      this.container.offsetHeight - this.scrollBarElement.offsetHeight;
    return Math.max(0, Math.min(newTop, maxTop));
  }

  /**
   * Updates the visual position of the scrollbar
   */
  private _setScrollBarPosition(top: number): void {
    this.scrollBarElement.style.top = `${top}px`;
  }

  /**
   * Triggers the main drag event with position data
   */
  private _triggerDragEvent(top: number): void {
    const mockEvent: DragEventUI = { position: { top } };
    this.onDrag(null, mockEvent);
  }

  /**
   * Sets the visual cursor style during dragging
   */
  private _setDraggingCursorStyle(isDragging: boolean): void {
    this.scrollBarElement.style.cursor = isDragging ? 'grabbing' : 'grab';

    if (isDragging) {
      this.container.classList.add('-dragging');
    }
  }
}
