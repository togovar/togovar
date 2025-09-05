import { storeManager } from '../../store/StoreManager';
import { TR_HEIGHT } from '../../global.js';
import { DragEventUI, StoreState } from '../../types';
import {
  calculateNewScrollPosition,
  constrainRowOffsetToValidRange,
  calculateTouchBasedRowOffset,
  convertScrollPositionToRowOffset,
  calculateScrollbarDimensions,
  ScrollBarRenderer,
  DragManager,
} from './scroll';

// Whether to ignore the scrollbar thumb height in calculations
const IGNORE_SCROLLBAR_THUMB_HEIGHT = true;

/**
 * Specialized scrollbar component for Results display (Refactored Version)
 *
 * ## Features
 * - Scroll processing specialized for Results display
 * - Mouse and touch drag support
 * - Automatic position calculation and feedback
 * - Performance optimized
 * - Modular design with separation of concerns
 *
 * ## Usage
 * ```typescript
 * const scrollbar = new ResultsScrollBar(containerElement);
 * ```
 */
export class ResultsScrollBar {
  // Core dom elements
  private readonly _container: HTMLElement;
  private readonly _scrollBarElement: HTMLElement;
  private readonly _positionLabel: HTMLElement;
  private readonly _totalLabel: HTMLElement;

  // State management
  private _lastScrollPosition: number = 0;

  // Component dependencies
  private readonly _renderer: ScrollBarRenderer;
  private readonly _dragManager: DragManager;

  /**
   * Creates a new ResultsScrollBar instance
   * @param containerElement - The container element where the scrollbar will be inserted
   */
  constructor(containerElement: HTMLElement) {
    this._container = containerElement;

    // Create HTML structure
    ScrollBarRenderer.createScrollBarHTML(this._container);

    // Get DOM elements
    const { scrollBar, position, total } = ScrollBarRenderer.initializeElements(
      this._container
    );
    this._scrollBarElement = scrollBar;
    this._positionLabel = position;
    this._totalLabel = total;

    // Initialize components
    this._renderer = new ScrollBarRenderer(
      this._container,
      this._scrollBarElement,
      this._positionLabel,
      this._totalLabel
    );
    this._dragManager = new DragManager({
      scrollBarElement: this._scrollBarElement,
      container: this._container,
      onDragCallback: this._handleDrag.bind(this),
      onVisualStateChange: this._handleVisualStateChange.bind(this),
    });

    this._bindStoreEvents();
    this._renderer.resetCursorStyle();
    this._dragManager.initializeDragManager();
  }

  /**
   * Binds this component to store events
   */
  private _bindStoreEvents(): void {
    storeManager.bind('offset', this);
    storeManager.bind('numberOfRecords', this);
    storeManager.bind('rowCount', this);
  }

  // ================================================================
  // Store Event Handlers
  // ================================================================

  /**
   * Store event handler: Called when offset value changes
   * Updates the displayed position and synchronizes scrollbar appearance
   * @param offset - The new offset value (0-based index)
   */
  offset(offset: number): void {
    this._renderer.updatePositionLabel(offset);
    this._synchronizeScrollBarWithStore();

    // Maintain active state on touch devices
    if (
      window.matchMedia('(hover: none) and (pointer: coarse)').matches &&
      this._container.classList.contains('-active')
    ) {
      return;
    }
  }

  /**
   * Store event handler: Called when the total record count changes
   *
   * This method is automatically invoked by StoreManager when the 'numberOfRecords'
   * state value changes. It updates the total count display and synchronizes the
   * scrollbar appearance to reflect the new dataset size.
   *
   * @param numberOfRecords - The new total count of records in the dataset
   */
  numberOfRecords(numberOfRecords: number): void {
    this._renderer.updateTotalLabel(numberOfRecords);
    this._synchronizeScrollBarWithStore();
  }

  /**
   * Store event handler: Called when the visible row count changes
   *
   * This method is automatically invoked by StoreManager when the 'rowCount'
   * state value changes. It triggers a UI update to recalculate scrollbar
   * dimensions based on the new viewport size.
   */
  rowCount(): void {
    this._synchronizeScrollBarWithStore();
  }

  // ================================================================
  // Visual State Management
  // ================================================================

  /**
   * Deactivates the scrollbar visual state
   */
  setInactive(): void {
    this._renderer.setInactive();
  }

  /**
   * Activates the scrollbar visual state
   */
  setActive(): void {
    this._renderer.setActive();
  }

  // ================================================================
  // Lifecycle Management
  // ================================================================

  /**
   * Clean up all resources and prevent memory leaks
   * Call this method when the scrollbar component is no longer needed
   */
  destroy(): void {
    // DragManager cleanup
    this._dragManager.destroyDragManager();

    // Unbind StoreManager event bindings
    storeManager.unbind('offset', this);
    storeManager.unbind('numberOfRecords', this);
    storeManager.unbind('rowCount', this);

    // Renderer timer cleanup
    this._renderer.clearAllTimeouts();

    // Remove the inner scrollbar element
    const scrollBarElement = this._container.querySelector('.bar');
    if (scrollBarElement) {
      scrollBarElement.remove();
    }
  }

  // ================================================================
  // Scroll Handling
  // ================================================================

  /**
   * Handle scroll with scrollbar feedback (for touch events)
   * @param deltaY - Y delta value
   * @param touchStartOffset - Starting offset when touch began
   */
  handleScrollWithFeedback(deltaY: number, touchStartOffset: number): void {
    const visibleRowCount = this._getStoreData('rowCount', 0);
    const totalRecordCount = this._getStoreData('numberOfRecords', 0);

    // Early return if data is invalid
    if (visibleRowCount <= 0 || totalRecordCount <= 0) {
      return;
    }

    const newOffset = calculateTouchBasedRowOffset(
      deltaY,
      touchStartOffset,
      visibleRowCount,
      totalRecordCount
    );
    const boundedOffset = constrainRowOffsetToValidRange(
      newOffset,
      visibleRowCount,
      totalRecordCount
    );

    this._lastScrollPosition = boundedOffset * TR_HEIGHT;
    storeManager.setData('offset', boundedOffset);
    this.updateDirectly(boundedOffset);
  }

  /**
   * Handle simple scroll (for wheel events)
   * @param deltaY - Y delta value
   */
  handleScroll(deltaY: number): void {
    const totalRecordCount = this._getStoreData('numberOfRecords', 0);
    const visibleRowCount = this._getStoreData('rowCount', 0);

    // Early return if data is invalid
    if (visibleRowCount <= 0 || totalRecordCount <= 0) {
      return;
    }

    const calculation = calculateNewScrollPosition(
      deltaY,
      this._lastScrollPosition,
      totalRecordCount,
      visibleRowCount
    );

    if (calculation.newScrollPosition === this._lastScrollPosition) {
      return;
    }

    this._lastScrollPosition = calculation.newScrollPosition;
    const offset = convertScrollPositionToRowOffset(this._lastScrollPosition);
    storeManager.setData('offset', offset);
  }

  /**
   * Update scrollbar directly with specific offset
   * @param offset - Offset value
   */
  updateDirectly(offset: number): void {
    const visibleRowCount = this._getStoreData('rowCount', 0);
    const totalRecordCount = this._getStoreData('numberOfRecords', 0);

    // Early return if data is invalid
    if (visibleRowCount <= 0 || totalRecordCount <= 0) {
      return;
    }

    const calculation = calculateScrollbarDimensions(
      offset,
      visibleRowCount,
      totalRecordCount
    );
    this._renderer.applyScrollBarStyles(calculation, offset);
  }

  // ================================================================
  // Data Access & Validation
  // ================================================================

  /**
   * Safely retrieves store data with validation
   * @param key - Store key to retrieve
   * @param defaultValue - Default value if data is invalid
   * @returns The store value or default value
   */
  private _getStoreData<T>(key: keyof StoreState, defaultValue: T): T {
    const value = storeManager.getData<T>(key);
    return typeof value === 'number' && value >= 0 ? value : defaultValue;
  }

  /**
   * Gets all essential scroll data from store with validation
   * @returns Object containing rowCount, numberOfRecords, and offset
   */
  private _getScrollData(): {
    visibleRowCount: number;
    totalRecordCount: number;
    offset: number;
  } {
    return {
      visibleRowCount: this._getStoreData('rowCount', 0),
      totalRecordCount: this._getStoreData('numberOfRecords', 0),
      offset: this._getStoreData('offset', 0),
    };
  }

  // ================================================================
  // Visual Updates
  // ================================================================

  /**
   * Synchronizes scrollbar appearance with current store data
   */
  private _synchronizeScrollBarWithStore(): void {
    const { offset, visibleRowCount, totalRecordCount } = this._getScrollData();

    const calculation = calculateScrollbarDimensions(
      offset,
      visibleRowCount,
      totalRecordCount
    );

    this._renderer.updateScrollBarVisualState(
      calculation,
      visibleRowCount,
      totalRecordCount
    );
  }

  // ================================================================
  // Drag Event Handlers
  // ================================================================

  /**
   * Handles drag events and updates scroll position
   * @param top - Drag position
   */
  private _handleDrag(top: number): void {
    // Update scrollbar position via renderer
    this._renderer.updateScrollBarPosition(top);

    const mockEvent: DragEventUI = { position: { top } };
    this._processDragPosition(null, mockEvent);
  }

  /**
   * Processes drag position and updates scroll state
   * @param e - The original event (can be null for programmatic calls)
   * @param ui - Object containing the drag position information
   */
  private _processDragPosition(e: Event | null, ui: DragEventUI): void {
    const visibleRowCount = this._getStoreData('rowCount', 0);
    const totalRecordCount = this._getStoreData('numberOfRecords', 0);

    // Early return if data is invalid
    if (visibleRowCount <= 0 || totalRecordCount <= 0) {
      return;
    }
    // Calculate available height for scrollbar movement
    const availableHeight = IGNORE_SCROLLBAR_THUMB_HEIGHT
      ? visibleRowCount * TR_HEIGHT
      : visibleRowCount * TR_HEIGHT - this._scrollBarElement.offsetHeight;
    const offsetRate = ui.position.top / availableHeight;

    let offset = Math.ceil(offsetRate * totalRecordCount);
    offset = constrainRowOffsetToValidRange(
      offset,
      visibleRowCount,
      totalRecordCount
    );

    // Update _lastScrollPosition to maintain consistency with trackpad scrolling
    this._lastScrollPosition = offset * TR_HEIGHT;

    storeManager.setData('offset', offset);
    this._renderer.activateDragStateWithAutoRelease();
  }

  /**
   * Handles visual state changes during drag operations
   * @param isDragging - Whether currently dragging
   */
  private _handleVisualStateChange(isDragging: boolean): void {
    this._renderer.updateCursorStyle(isDragging);
    this._renderer.updateDraggingState(isDragging);
  }
}
