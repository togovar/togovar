import type { ScrollBarCalculation } from '../../../types';

const RELEASE_DURATION = 2000;

/**
 * Class responsible for DOM manipulation and rendering of scrollbars
 */
export class ScrollBarRenderer {
  // Constants
  private static readonly CLASS_CURSOR_GRAB = 'grab';
  private static readonly CLASS_CURSOR_GRABBING = 'grabbing';

  private static readonly CLASS_ACTIVE = '-active';
  private static readonly CLASS_DRAGGING = '-dragging';
  private static readonly CLASS_DISABLED = '-disabled';

  private static readonly CLASS_BAR = 'bar';
  private static readonly CLASS_POSITION = 'position';
  private static readonly CLASS_TOTAL = 'total';

  // Instance Properties
  private _releaseTimeoutId: number | undefined;

  // DOM elements
  private readonly _container: HTMLElement;
  private readonly _scrollBarElement: HTMLElement;
  private readonly _positionLabel: HTMLElement;
  private readonly _totalLabel: HTMLElement;

  constructor(
    container: HTMLElement,
    scrollBarElement: HTMLElement,
    positionLabel: HTMLElement,
    totalLabel: HTMLElement
  ) {
    this._container = container;
    this._scrollBarElement = scrollBarElement;
    this._positionLabel = positionLabel;
    this._totalLabel = totalLabel;
  }

  // ========================================
  // DOM Initialization
  // ========================================

  /**
   * Create and inject HTML structure for scrollbar into container
   * @param container - Container element where scrollbar HTML will be inserted
   */
  static createScrollBarHTML(container: HTMLElement): void {
    container.insertAdjacentHTML(
      'beforeend',
      `
      <div class="${ScrollBarRenderer.CLASS_BAR}">
        <div class="indicator">
          <span class="${ScrollBarRenderer.CLASS_POSITION}">1</span>
          <span class="${ScrollBarRenderer.CLASS_TOTAL}"></span>
        </div>
      </div>
      `
    );
  }

  /**
   * Initialize and validate required DOM elements from container
   * @param container - Container element containing the scrollbar structure
   * @returns Object containing validated scrollbar DOM elements
   */
  static initializeElements(container: HTMLElement) {
    const scrollBar = container.querySelector(
      `.${ScrollBarRenderer.CLASS_BAR}`
    )! as HTMLElement;
    const position = scrollBar.querySelector(
      `.${ScrollBarRenderer.CLASS_POSITION}`
    )! as HTMLElement;
    const total = scrollBar.querySelector(
      `.${ScrollBarRenderer.CLASS_TOTAL}`
    )! as HTMLElement;

    return { scrollBar, position, total };
  }

  // ========================================
  // Label Update
  // ========================================

  /**
   * Update position label display
   * @param offset - Offset value
   */
  updatePositionLabel(offset: number): void {
    this._positionLabel.textContent = String(offset + 1);
  }

  /**
   * Update total label
   * @param numberOfRecords - Total number of records
   */
  updateTotalLabel(numberOfRecords: number): void {
    this._totalLabel.textContent = numberOfRecords.toLocaleString();
  }

  // ========================================
  // Position & Size Styling
  // ========================================

  /**
   * Apply scrollbar styles with calculation results
   * @param calculation - Calculation results
   * @param offset - Offset value
   */
  applyScrollBarStyles(
    calculation: ScrollBarCalculation,
    offset: number
  ): void {
    // Apply bar styles
    this._scrollBarElement.style.height = `${calculation.barHeight}px`;
    this._scrollBarElement.style.top = `${calculation.barTop}px`;

    // Update position display
    this.updatePositionLabel(offset);

    // Maintain active state
    this._container.classList.add(ScrollBarRenderer.CLASS_ACTIVE);
  }

  /**
   * Update scrollbar visual state and disabled status
   * @param calculation - Calculation results
   * @param rowCount - Number of visible rows
   * @param numberOfRecords - Total number of records
   */
  updateScrollBarVisualState(
    calculation: ScrollBarCalculation,
    rowCount: number,
    numberOfRecords: number
  ): void {
    this._scrollBarElement.style.height = `${calculation.barHeight}px`;
    this._scrollBarElement.style.top = `${calculation.barTop}px`;

    // Show dragging state when scrollbar updates due to data changes
    // This provides visual feedback that the scrollbar position/size changed
    // Auto-release ensures the feedback disappears after users have time to notice
    this.activateDragStateWithAutoRelease();

    if (rowCount === 0 || numberOfRecords === rowCount) {
      this._scrollBarElement.classList.add(ScrollBarRenderer.CLASS_DISABLED);
    } else {
      this._scrollBarElement.classList.remove(ScrollBarRenderer.CLASS_DISABLED);
    }
  }

  /**
   * Update scrollbar position (top style)
   * @param top - Top position in pixels
   */
  updateScrollBarPosition(top: number): void {
    this._scrollBarElement.style.top = `${top}px`;
  }

  // ========================================
  // Active State Management
  // ========================================

  /**
   * Set scrollbar as active
   */
  setActive(): void {
    this._container.classList.add(ScrollBarRenderer.CLASS_ACTIVE);
  }

  /**
   * Set scrollbar as inactive
   */
  setInactive(): void {
    this._container.classList.remove(ScrollBarRenderer.CLASS_ACTIVE);
  }

  // ========================================
  // Drag State Management
  // ========================================

  /**
   * Update dragging state
   * @param isDragging - Whether currently dragging
   */
  updateDraggingState(isDragging: boolean): void {
    if (isDragging) {
      // User started dragging: immediately show dragging state
      this._container.classList.add(ScrollBarRenderer.CLASS_DRAGGING);
      this._container.classList.add(ScrollBarRenderer.CLASS_ACTIVE);
    } else {
      // User stopped dragging: use auto-release to provide visual feedback
      this.activateDragStateWithAutoRelease();
    }
  }

  /**
   * Activate dragging visual state and schedule its automatic release
   * Sets the dragging state immediately and schedules removal after delay
   */
  activateDragStateWithAutoRelease(): void {
    // Clear any existing timeout to prevent multiple timers running simultaneously
    if (this._releaseTimeoutId !== undefined) {
      window.clearTimeout(this._releaseTimeoutId);
    }

    // Immediately show dragging state for instant visual feedback
    // This must happen before setTimeout to ensure users see immediate response
    this._container.classList.add(ScrollBarRenderer.CLASS_DRAGGING);

    // Schedule automatic removal of dragging state after delay
    // This provides visual feedback time for users to notice the change
    // while ensuring the UI returns to normal state automatically
    this._releaseTimeoutId = window.setTimeout(() => {
      // Remove dragging state to return scrollbar to normal visual appearance
      this._container.classList.remove(ScrollBarRenderer.CLASS_DRAGGING);
      // Clear the timeout ID after execution to maintain clean state
      this._releaseTimeoutId = undefined;
    }, RELEASE_DURATION);
  }

  /**
   * Update cursor style for drag operations
   * @param isDragging - Whether currently dragging
   */
  updateCursorStyle(isDragging: boolean): void {
    this._scrollBarElement.style.cursor = isDragging
      ? ScrollBarRenderer.CLASS_CURSOR_GRABBING
      : ScrollBarRenderer.CLASS_CURSOR_GRAB;
  }

  /**
   * Reset cursor style to default
   */
  resetCursorStyle(): void {
    this._scrollBarElement.style.cursor = ScrollBarRenderer.CLASS_CURSOR_GRAB;
  }

  // ========================================
  // Cleanup
  // ========================================

  /**
   * Clean up all timeouts and timers
   * Call this method when the renderer is no longer needed
   */
  clearAllTimeouts(): void {
    if (this._releaseTimeoutId !== undefined) {
      window.clearTimeout(this._releaseTimeoutId);
      // CRITICAL: Reset to undefined to prevent memory leaks and state confusion
      // Without this, the timeout ID remains in memory and state checks become unreliable
      this._releaseTimeoutId = undefined;
    }
  }
}
