import { storeManager } from '../store/StoreManager';
import { TR_HEIGHT } from '../global.js';

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

/**
 * Data structure for store data
 */
interface StoreData {
  offset: number;
  rowCount: number;
  numberOfRecords: number;
}

/**
 * Custom scrollbar component for large datasets with drag functionality
 * Supports both mouse and touch interactions for desktop and mobile devices
 */
export default class ScrollBar {
  private elm: HTMLElement; // Container element for the scrollbar
  private bar: HTMLElement; // Main scrollbar element
  private position: HTMLElement; // Display element for current position
  private total: HTMLElement; // Display element for total count
  private timeoutId: number | undefined; // Timeout ID for delayed release
  private dragState: DragState | undefined; // State object for mouse drag operations
  private isDragging: boolean = false; // Flag indicating if touch dragging is active
  private touchStartY: number = 0; // Initial Y coordinate for touch drag
  private touchStartTop: number = 0; // Initial top position for touch drag

  /**
   * Creates a new ScrollBar instance
   * @param elm - The container element where the scrollbar will be inserted
   */
  constructor(elm: HTMLElement) {
    this.elm = elm;
    this.elm.insertAdjacentHTML(
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

    const bar = this.elm.querySelector('.bar') as HTMLElement;

    if (!bar) {
      throw new Error('ScrollBar element (.bar) not found');
    }

    this.bar = bar;

    const position = this.bar.querySelector('.position') as HTMLElement;
    const total = this.bar.querySelector('.total') as HTMLElement;

    if (!position || !total) {
      throw new Error(
        'Required indicator elements (.position, .total) not found'
      );
    }

    this.position = position;
    this.total = total;

    // Bind store events
    storeManager.bind('offset', this);
    storeManager.bind('numberOfRecords', this);
    storeManager.bind('rowCount', this);

    // Initialize drag functionality based on device capability
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      this._setupMouseDrag();
    }

    this._setupTouchEvents();
  }

  /**
   * Handles drag operation and updates the scroll position in the data store
   * @param e - The original event (can be null for programmatic calls)
   * @param ui - Object containing the drag position information
   */
  drag(e: Event | null, ui: DragEventUI): void {
    const rowCount = storeManager.getData('rowCount') as number;
    const numberOfRecords = storeManager.getData('numberOfRecords') as number;
    const availableHeight = rowCount * TR_HEIGHT - this.bar.offsetHeight * 0;
    const offsetRate = ui.position.top / availableHeight;

    let offset = Math.ceil(offsetRate * numberOfRecords);
    offset = offset < 0 ? 0 : offset;
    offset =
      offset + rowCount > numberOfRecords ? numberOfRecords - rowCount : offset;

    storeManager.setData('offset', offset);
    this._prepareRelease();
  }

  /**
   * Updates the displayed position when the offset changes
   * @param offset - The new offset value (0-based index)
   */
  offset(offset: number): void {
    this.position.textContent = (offset + 1).toString();
    this._update();

    // Maintain active state on touch devices
    if (
      window.matchMedia('(hover: none) and (pointer: coarse)').matches &&
      this.elm.classList.contains('-active')
    ) {
      return;
    }
  }

  /**
   * Updates the total number of records displayed
   * @param numberOfRecords - The total count of records
   */
  numberOfRecords(numberOfRecords: number): void {
    this.total.textContent = numberOfRecords.toLocaleString();
    this._update();
  }

  /**
   * Handles row count changes and triggers a UI update
   */
  rowCount(): void {
    this._update();
  }

  /**
   * Updates the scrollbar appearance based on current data store values
   * Calculates bar height, position, and disabled state
   */
  private _update(): void {
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

    this.bar.style.height = `${barHeight}px`;
    this.bar.style.top = `${barTop}px`;
    this._prepareRelease();

    if (rowCount === 0 || numberOfRecords === rowCount) {
      this.bar.classList.add('-disabled');
    } else {
      this.bar.classList.remove('-disabled');
    }
  }

  /**
   * Prepares for delayed release of dragging state
   * Sets up a timeout to remove dragging visual state after a delay
   */
  private _prepareRelease(): void {
    if (this.timeoutId !== undefined) {
      window.clearTimeout(this.timeoutId);
    }
    this.timeoutId = window.setTimeout(
      this._release.bind(this),
      RELEASE_DURATION
    );
    this.elm.classList.add('-dragging');
  }

  /**
   * Removes the dragging visual state from the scrollbar
   */
  private _release(): void {
    this.elm.classList.remove('-dragging');
  }

  /**
   * Sets up mouse drag functionality for desktop devices
   * Initializes drag state and attaches mouse event listeners
   */
  private _setupMouseDrag(): void {
    // Initialize drag state
    this.dragState = {
      isDragging: false,
      startY: 0,
      startTop: 0,
    };

    this._initializeCursor();
    this._attachMouseEvents();
  }

  /**
   * Sets the initial cursor style for the scrollbar
   */
  private _initializeCursor(): void {
    this.bar.style.cursor = 'grab';
  }

  /**
   * Attaches mouse event listeners for drag functionality
   */
  private _attachMouseEvents(): void {
    this.bar.addEventListener('mousedown', this._handleMouseDown.bind(this));
    document.addEventListener('mousemove', this._handleMouseMove.bind(this));
    document.addEventListener('mouseup', this._handleMouseUp.bind(this));
  }

  /**
   * Handles mouse down events to start dragging
   * @param e - The mouse event
   */
  private _handleMouseDown(e: MouseEvent): void {
    if (!this.dragState) return;

    e.preventDefault();

    this.dragState.isDragging = true;
    this.dragState.startY = e.clientY;
    this.dragState.startTop = parseInt(this.bar.style.top) || 0;

    this._setDraggingState(true);
  }

  /**
   * Handles mouse move events during dragging
   * @param e - The mouse event
   */
  private _handleMouseMove(e: MouseEvent): void {
    if (!this.dragState?.isDragging) return;

    e.preventDefault();

    const deltaY = e.clientY - this.dragState.startY;
    const newTop = this.dragState.startTop + deltaY;
    const constrainedTop = this._constrainPosition(newTop);

    this._updateBarPosition(constrainedTop);
    this._triggerDragEvent(constrainedTop);
  }

  /**
   * Handles mouse up events to end dragging
   */
  private _handleMouseUp(): void {
    if (!this.dragState?.isDragging) return;

    this.dragState.isDragging = false;
    this._setDraggingState(false);
    this._prepareRelease();
  }

  /**
   * Constrains the bar position within the container bounds
   * @param newTop - The desired new top position
   * @returns The constrained top position
   */
  private _constrainPosition(newTop: number): number {
    const maxTop = this.elm.offsetHeight - this.bar.offsetHeight;
    return Math.max(0, Math.min(newTop, maxTop));
  }

  /**
   * Updates the visual position of the scrollbar
   * @param top - The new top position in pixels
   */
  private _updateBarPosition(top: number): void {
    this.bar.style.top = `${top}px`;
  }

  /**
   * Triggers the main drag event with position data
   * @param top - The current top position
   */
  private _triggerDragEvent(top: number): void {
    const mockEvent: DragEventUI = { position: { top } };
    this.drag(null, mockEvent);
  }

  /**
   * Sets the visual dragging state of the scrollbar
   * @param isDragging - Whether the bar is currently being dragged
   */
  private _setDraggingState(isDragging: boolean): void {
    this.bar.style.cursor = isDragging ? 'grabbing' : 'grab';

    if (isDragging) {
      this.elm.classList.add('-dragging');
    }
  }

  /**
   * Sets up touch event listeners for mobile device support
   */
  private _setupTouchEvents(): void {
    this.bar.addEventListener('touchstart', this._handleTouchStart.bind(this), {
      passive: false,
    });
    this.bar.addEventListener('touchmove', this._handleTouchMove.bind(this), {
      passive: false,
    });
    this.bar.addEventListener('touchend', this._handleTouchEnd.bind(this), {
      passive: false,
    });
  }

  /**
   * Handles touch start events to begin touch dragging
   * @param e - The touch event
   */
  private _handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    this.isDragging = true;
    this.touchStartY = e.touches[0].clientY;
    this.touchStartTop = parseInt(this.bar.style.top) || 0;
    this.elm.classList.add('-dragging');
    this.elm.classList.add('-active');
  }

  /**
   * Handles touch move events during touch dragging
   * @param e - The touch event
   */
  private _handleTouchMove(e: TouchEvent): void {
    if (!this.isDragging) return;
    e.preventDefault();

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - this.touchStartY;
    const newTop = this.touchStartTop + deltaY;

    const mockEvent: DragEventUI = { position: { top: newTop } };
    this.drag(null, mockEvent);
  }

  /**
   * Handles touch end events to finish touch dragging
   * @param e - The touch event
   */
  private _handleTouchEnd(e: TouchEvent): void {
    if (!this.isDragging) return;
    e.preventDefault();
    this.isDragging = false;
    this._prepareRelease();
    this.elm.classList.remove('-active');
  }
}
