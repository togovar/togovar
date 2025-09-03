import { ScrollBarCalculation } from '../../../types';

const RELEASE_DURATION = 2000;

/**
 * Class responsible for DOM manipulation and rendering of scrollbars
 */
export class ScrollBarRenderer {
  // Constants
  private static readonly CURSOR_GRAB = 'grab';
  private static readonly CURSOR_GRABBING = 'grabbing';

  private static readonly CSS_CLASS_ACTIVE = '-active';
  private static readonly CSS_CLASS_DRAGGING = '-dragging';
  private static readonly CSS_CLASS_DISABLED = '-disabled';

  private static readonly SELECTOR_BAR = '.bar';
  private static readonly SELECTOR_POSITION = '.position';
  private static readonly SELECTOR_TOTAL = '.total';

  // Instance Properties
  private _releaseTimeoutId: number | undefined;

  // DOM elements
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
      <div class="${ScrollBarRenderer.SELECTOR_BAR.slice(1)}">
        <div class="indicator">
          <span class="${ScrollBarRenderer.SELECTOR_POSITION.slice(1)}">1</span>
          <span class="${ScrollBarRenderer.SELECTOR_TOTAL.slice(1)}"></span>
        </div>
      </div>
      `
    );
  }

  /**
   * Initialize and validate required DOM elements from container
   * @param container - Container element containing the scrollbar structure
   * @returns Object containing validated scrollbar DOM elements
   * @throws Error if required elements are not found
   */
  static initializeElements(container: HTMLElement) {
    const scrollBar = ScrollBarRenderer._getElement(
      container,
      ScrollBarRenderer.SELECTOR_BAR,
      'ScrollBar element'
    );

    const position = ScrollBarRenderer._getElement(
      scrollBar,
      ScrollBarRenderer.SELECTOR_POSITION,
      'Position indicator element'
    );

    const total = ScrollBarRenderer._getElement(
      scrollBar,
      ScrollBarRenderer.SELECTOR_TOTAL,
      'Total indicator element'
    );

    return { scrollBar, position, total };
  }

  /**
   * Safely retrieve a DOM element with validation
   * @param parent - Parent element to search within
   * @param selector - CSS selector for the target element
   * @param description - Human-readable description for error messages
   * @returns The found HTML element
   * @throws Error if element is not found
   */
  private static _getElement(
    parent: Element,
    selector: string,
    description: string
  ): HTMLElement {
    const element = parent.querySelector(selector) as HTMLElement;
    if (!element) {
      throw new Error(`${description} (${selector}) not found`);
    }
    return element;
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
    this._container.classList.add(ScrollBarRenderer.CSS_CLASS_ACTIVE);
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
      this._scrollBarElement.classList.add(
        ScrollBarRenderer.CSS_CLASS_DISABLED
      );
    } else {
      this._scrollBarElement.classList.remove(
        ScrollBarRenderer.CSS_CLASS_DISABLED
      );
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
    this._container.classList.add(ScrollBarRenderer.CSS_CLASS_DRAGGING);
  }

  /**
   * Activate scrollbar
   */
  activate(): void {
    this._container.classList.add(ScrollBarRenderer.CSS_CLASS_ACTIVE);
  }

  /**
   * Deactivate scrollbar
   */
  deactivate(): void {
    this._container.classList.remove(ScrollBarRenderer.CSS_CLASS_ACTIVE);
  }

  /**
   * Set dragging state
   * @param isDragging - Whether currently dragging
   */
  setDraggingState(isDragging: boolean): void {
    if (isDragging) {
      this._container.classList.add(ScrollBarRenderer.CSS_CLASS_DRAGGING);
      this._container.classList.add(ScrollBarRenderer.CSS_CLASS_ACTIVE);
    } else {
      this.scheduleVisualStateRelease();
    }
  }

  /**
   * Set cursor style
   * @param isDragging - Whether currently dragging
   */
  setCursorStyle(isDragging: boolean): void {
    this._scrollBarElement.style.cursor = isDragging
      ? ScrollBarRenderer.CURSOR_GRABBING
      : ScrollBarRenderer.CURSOR_GRAB;
  }

  /**
   * Initialize cursor style for drag operations
   */
  initializeCursor(): void {
    this._scrollBarElement.style.cursor = ScrollBarRenderer.CURSOR_GRAB;
  }

  /**
   * Update scrollbar position
   * @param top - Top position in pixels
   */
  updateScrollBarPosition(top: number): void {
    this._scrollBarElement.style.top = `${top}px`;
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
    this._container.classList.remove(ScrollBarRenderer.CSS_CLASS_DRAGGING);
  }
}
