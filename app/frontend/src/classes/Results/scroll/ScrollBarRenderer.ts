import { ScrollBarCalculation } from '../../../types';

const RELEASE_DURATION = 2000;

/**
 * Class responsible for DOM manipulation and rendering of scrollbars
 */
export class ScrollBarRenderer {
  private _releaseTimeoutId: number | undefined;

  // DOM elements (managed by this renderer)
  private readonly _container: HTMLElement;
  private readonly _scrollBarElement: HTMLElement;
  private readonly _positionDisplay: HTMLElement;
  private readonly _totalDisplay: HTMLElement;

  constructor(
    container: HTMLElement,
    scrollBarElement: HTMLElement,
    positionDisplay: HTMLElement,
    totalDisplay: HTMLElement
  ) {
    this._container = container;
    this._scrollBarElement = scrollBarElement;
    this._positionDisplay = positionDisplay;
    this._totalDisplay = totalDisplay;
  }

  // ========================================
  // Public API - DOM Element Access
  // ========================================

  /**
   * Get container element
   */
  getContainer(): HTMLElement {
    return this._container;
  }

  /**
   * Get scrollbar element (primary DOM element)
   */
  getScrollBarElement(): HTMLElement {
    return this._scrollBarElement;
  }

  /**
   * Get position display element
   */
  getPositionDisplay(): HTMLElement {
    return this._positionDisplay;
  }

  /**
   * Get total display element
   */
  getTotalDisplay(): HTMLElement {
    return this._totalDisplay;
  }

  // ========================================
  // Static Factory Methods
  // ========================================

  /**
   * Create HTML structure for scrollbar
   * @param container - Container element
   */
  static createScrollBarHTML(container: HTMLElement): void {
    container.insertAdjacentHTML(
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
   * Get required DOM elements with validation
   * @param container - Container element
   */
  static getRequiredElements(container: HTMLElement) {
    const scrollBar = container.querySelector('.bar') as HTMLElement;
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

  // ========================================
  // Public API - Style and Layout Methods
  // ========================================

  /**
   * Apply scrollbar styles
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
    this.updatePositionDisplay(offset);

    // Maintain active state
    this._container.classList.add('-active');
  }

  /**
   * Update position display
   * @param offset - Offset value
   */
  updatePositionDisplay(offset: number): void {
    this._positionDisplay.textContent = String(offset + 1);
  }

  /**
   * Update total display
   * @param numberOfRecords - Total number of records
   */
  updateTotalDisplay(numberOfRecords: number): void {
    this._totalDisplay.textContent = numberOfRecords.toLocaleString();
  }

  /**
   * Update scrollbar appearance
   * @param calculation - Calculation results
   * @param rowCount - Number of visible rows
   * @param numberOfRecords - Total number of records
   */
  updateScrollBarAppearance(
    calculation: ScrollBarCalculation,
    rowCount: number,
    numberOfRecords: number
  ): void {
    this._scrollBarElement.style.height = `${calculation.barHeight}px`;
    this._scrollBarElement.style.top = `${calculation.barTop}px`;
    this.scheduleVisualStateRelease();

    if (rowCount === 0 || numberOfRecords === rowCount) {
      this._scrollBarElement.classList.add('-disabled');
    } else {
      this._scrollBarElement.classList.remove('-disabled');
    }
  }

  /**
   * Set scrollbar position
   * @param top - Top position
   */
  setScrollBarPosition(top: number): void {
    this._scrollBarElement.style.top = `${top}px`;
  }

  // ========================================
  // Public API - State Management Methods
  // ========================================

  /**
   * Schedule delayed release of visual state
   */
  scheduleVisualStateRelease(): void {
    if (this._releaseTimeoutId !== undefined) {
      window.clearTimeout(this._releaseTimeoutId);
    }
    this._releaseTimeoutId = window.setTimeout(
      this._releaseVisualState.bind(this),
      RELEASE_DURATION
    );
    this._container.classList.add('-dragging');
  }

  /**
   * Activate scrollbar
   */
  activate(): void {
    this._container.classList.add('-active');
  }

  /**
   * Deactivate scrollbar
   */
  deactivate(): void {
    this._container.classList.remove('-active');
  }

  /**
   * Set dragging state
   * @param isDragging - Whether currently dragging
   */
  setDraggingState(isDragging: boolean): void {
    if (isDragging) {
      this._container.classList.add('-dragging');
      this._container.classList.add('-active');
    } else {
      this.scheduleVisualStateRelease();
    }
  }

  /**
   * Set cursor style
   * @param isDragging - Whether currently dragging
   */
  setCursorStyle(isDragging: boolean): void {
    this._scrollBarElement.style.cursor = isDragging ? 'grabbing' : 'grab';
  }

  /**
   * Clean up all timeouts and timers
   * Call this method when the renderer is no longer needed
   */
  clearTimeouts(): void {
    if (this._releaseTimeoutId !== undefined) {
      window.clearTimeout(this._releaseTimeoutId);
      this._releaseTimeoutId = undefined;
    }
  }

  // ========================================
  // Private Methods
  // ========================================

  /**
   * Release drag visual state
   */
  private _releaseVisualState(): void {
    this._container.classList.remove('-dragging');
  }
}
