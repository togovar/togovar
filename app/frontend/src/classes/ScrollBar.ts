import { storeManager } from '../store/StoreManager';
import { TR_HEIGHT } from '../global.js';

// ================================================================
// CONSTANTS & TYPES
// ================================================================

const RELEASE_DURATION = 2000;
const MIN_HEIGHT = 30;

/**
 * Represents the state of a drag operation
 */
interface DragState {
  isDragging: boolean;
  startY: number;
  startTop: number;
}

/**
 * UI object for drag events containing position information
 */
interface DragEventUI {
  position: {
    top: number;
  };
}

// ================================================================
// MAIN CLASS
// ================================================================

/**
 * Custom scrollbar component for large datasets with drag functionality
 *
 * ## Features
 * - Mouse drag support for desktop devices
 * - Touch drag support for mobile devices
 * - Automatic position calculation based on data
 * - Visual feedback during interactions
 *
 * ## Usage
 * ```typescript
 * const scrollbar = new ScrollBar(containerElement);
 * ```
 */
export default class ScrollBar {
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

  // ================================================================
  // CONSTRUCTOR & INITIALIZATION
  // ================================================================

  /**
   * Creates a new ScrollBar instance
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
    barHeight = barHeight < MIN_HEIGHT ? MIN_HEIGHT : barHeight;

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
