import { storeManager } from '../../store/StoreManager';
import type { ResultsRowView } from './ResultsRowView';
import { ResultsViewDisplayManager } from './ResultsViewDisplayManager';
import type {
  DisplayingRegions,
  SearchMessages,
  SearchStatus,
  ColumnConfig,
  ResultsRecord,
} from '../../types';

interface SelectionState {
  currentIndex: number;
  rowCount: number;
  offset: number;
  numberOfRecords: number;
}

/**
 * Manages data for the results view.
 * Handles displaying search results, interacting with the store, and managing rows.
 */
export class ResultsViewDataManager {
  private _container: HTMLElement; // Root element
  private _rows: ResultsRowView[] = []; // Array of result row view instances
  private _status: HTMLElement; // Status display element
  private _messages: HTMLElement; // Message display element
  private _isDestroyed = false; // Track if instance has been destroyed

  _tbody: HTMLElement; // Table body element
  _stylesheet: HTMLStyleElement; // Stylesheet for column display control

  private _displayManager: ResultsViewDisplayManager;

  /**
   * Constructor for ResultsViewDataManager.
   * @param _container - The root element for the results view.
   * @param _status - The element for displaying status messages.
   * @param _messages - The element for displaying search messages.
   * @param _tbody - The table body element where rows are appended.
   * @param _stylesheet - The stylesheet element for dynamic column styling.
   */
  constructor(
    _container: HTMLElement,
    _status: HTMLElement,
    _messages: HTMLElement,
    _tbody: HTMLElement,
    _stylesheet: HTMLStyleElement
  ) {
    this._container = _container;
    this._status = _status;
    this._messages = _messages;
    this._tbody = _tbody;
    this._stylesheet = _stylesheet;
    this._displayManager = new ResultsViewDisplayManager(_tbody, _stylesheet);
  }

  // ========================================
  // Display Management
  // ========================================

  /**
   * Updates the display size of the results view.
   * Ensures rows are adjusted based on the available space and updates animations.
   * @param isTouchDevice - Whether the device supports touch input.
   * @param setTouchElementsPointerEvents - Function to control pointer-events for touch elements.
   */
  updateDisplaySize(
    isTouchDevice: boolean,
    setTouchElementsPointerEvents: (_enabled: boolean) => void
  ): void {
    if (this._isDestroyed) return;
    this._displayManager.updateDisplaySize(
      isTouchDevice,
      setTouchElementsPointerEvents
    );
  }

  /**
   * Handles the display of search results.
   * Delegates to ResultsViewDisplayManager and ensures retry logic is respected.
   * @param _results - The search results (currently unused).
   * @param isTouchDevice - Whether the device supports touch input.
   * @param setTouchElementsPointerEvents - Function to control pointer-events for touch elements.
   */
  handleSearchResults(
    _results: unknown,
    isTouchDevice: boolean,
    setTouchElementsPointerEvents: (_enabled: boolean) => void
  ): void {
    this._displayManager.handleSearchResults(
      isTouchDevice,
      setTouchElementsPointerEvents
    );
  }

  /**
   * Controls the visibility of columns in the results table.
   * Applies styles to show or hide columns based on the provided configuration.
   * @param columns - Array of column configuration objects.
   */
  handleColumnsChange(columns: ColumnConfig[]): void {
    this._displayManager.handleColumnsChange(columns);
  }

  // ========================================
  // Status and Messages Handling
  // ========================================

  /**
   * Displays search messages in the UI.
   * Clears existing messages and appends new ones based on their type (notice, warning, error).
   * @param messages - The object containing search messages.
   */
  handleSearchMessages(messages: SearchMessages): void {
    this._messages.innerHTML = '';

    this._appendMessageIfExists(messages.notice, 'notice');
    this._appendMessageIfExists(messages.warning, 'warning');
    this._appendMessageIfExists(messages.error, 'error');
  }

  /**
   * Updates the search status in the UI.
   * Displays the number of available and filtered variations.
   * @param status - The object containing search status information.
   */
  handleSearchStatus(status: SearchStatus): void {
    const { available, filtered } = status;

    this._status.innerHTML =
      `The number of available variations is ${available.toLocaleString()} ` +
      `out of <span class="bigger">${filtered.toLocaleString()}</span>.`;

    this._updateNotFoundState(filtered === 0);
  }

  // ========================================
  // Offset and Selection Handling
  // ========================================

  /**
   * Handles changes to the offset value.
   * Updates the visible regions on the chromosome based on the new offset.
   * @param offset - The new offset value.
   */
  handleOffsetChange(_offset: number): void {
    if (this._shouldSkipOffsetUpdate()) {
      return;
    }

    const displayingRegions = this._calculateDisplayingRegions();
    if (Object.keys(displayingRegions).length > 0) {
      storeManager.setData('displayingRegionsOnChromosome', displayingRegions);
    }
  }

  /**
   * Moves the selected row in the specified direction.
   * Updates the offset and selected row index accordingly.
   * @param direction - The direction to move the selection (+1 for down, -1 for up).
   */
  shiftSelectedRow(direction: number): void {
    const state = this._getSelectionState();
    const newIndex = this._calculateNewIndex(state, direction);
    const adjustedOffset = this._adjustOffsetForSelection(
      state,
      newIndex,
      direction
    );

    if (adjustedOffset !== state.offset) {
      storeManager.setData('offset', adjustedOffset);
    }

    storeManager.setData('selectedRow', newIndex);
  }

  // ================================================================
  // Lifecycle Management
  // ================================================================

  /**
   * Clean up all resources and row instances
   * Call this method when the DataManager is no longer needed
   */
  destroy(): void {
    if (this._isDestroyed) return;

    // Clean up all row instances
    this._rows.forEach((row) => {
      if (row && typeof row.destroy === 'function') {
        row.destroy();
      }
    });
    this._rows = [];

    // Clean up display manager (if it has destroy method in the future)
    // Note: ResultsViewDisplayManager doesn't currently have a destroy method

    // Mark as destroyed to prevent further operations
    this._isDestroyed = true;

    // Note: DOM references are kept to avoid TypeScript null assertion issues
    // The _isDestroyed flag ensures the instance won't be used after cleanup
  }

  // ========================================
  // Private Methods
  // ========================================

  /**
   * Checks if the offset update should be skipped.
   * @returns True if the offset update should be skipped, false otherwise.
   */
  private _shouldSkipOffsetUpdate(): boolean {
    return (
      storeManager.getData('isStoreUpdating') ||
      storeManager.getData('isFetching')
    );
  }

  /**
   * Calculates the regions of the chromosome that are currently displayed.
   * @returns An object mapping chromosome identifiers to their displaying regions.
   */
  private _calculateDisplayingRegions(): DisplayingRegions {
    const rowCount = storeManager.getData('rowCount');
    const chromosomePositions: { [key: string]: number[] } = {};

    // Collect chromosome positions from each row's record
    for (let i = 0; i < rowCount; i++) {
      const record = storeManager.getRecordByIndex(i) as ResultsRecord;

      if (this._isValidRecord(record)) {
        (chromosomePositions[record.chromosome] ??= []).push(record.start);
      }
    }

    return this._convertToRegions(chromosomePositions);
  }

  /**
   * Checks if a record is valid and conforms to the expected structure.
   * @param record - The record object to validate.
   * @returns True if the record is valid, false otherwise.
   */
  private _isValidRecord(record: unknown): record is ResultsRecord {
    if (record === null || typeof record !== 'object') {
      return false;
    }

    const obj = record as Record<string, unknown>;
    return typeof obj.chromosome === 'string' && typeof obj.start === 'number';
  }

  /**
   * Converts an array of chromosome positions to a regions object.
   * @param chromosomePositions - The object containing arrays of chromosome positions.
   * @returns An object mapping chromosome identifiers to their corresponding regions.
   */
  private _convertToRegions(chromosomePositions: {
    [key: string]: number[];
  }): DisplayingRegions {
    const regions: DisplayingRegions = {};

    for (const chromosome in chromosomePositions) {
      const positions = chromosomePositions[chromosome];
      regions[chromosome] = {
        start: Math.min(...positions),
        end: Math.max(...positions),
      };
    }

    return regions;
  }

  /**
   * Appends a message to the messages element if it exists.
   * @param message - The message string to append.
   * @param type - The type of the message (e.g., notice, warning, error).
   */
  private _appendMessageIfExists(
    message: string | undefined,
    type: string
  ): void {
    if (message) {
      this._messages.innerHTML += `<div class="message -${type}">${message}</div>`;
    }
  }

  /**
   * Updates the UI to reflect the state when no search results are found.
   * @param isNotFound - True if the not found state is active, false otherwise.
   */
  private _updateNotFoundState(isNotFound: boolean): void {
    if (isNotFound) {
      this._container.classList.add('-not-found');
    } else {
      this._container.classList.remove('-not-found');
    }
  }

  /**
   * Retrieves the current selection state from the store.
   * @returns An object representing the current selection state.
   */
  private _getSelectionState(): SelectionState {
    return {
      currentIndex: storeManager.getData('selectedRow'),
      rowCount: storeManager.getData('rowCount'),
      offset: storeManager.getData('offset'),
      numberOfRecords: storeManager.getData('numberOfRecords'),
    };
  }

  /**
   * Calculates a new index for the selected row based on the current state and direction.
   * @param state - The current selection state.
   * @param direction - The direction to move the selection (+1 or -1).
   * @returns The calculated new index for the selected row.
   */
  private _calculateNewIndex(state: SelectionState, direction: number): number {
    const newIndex = state.currentIndex + direction;
    return Math.max(0, Math.min(newIndex, state.rowCount - 1));
  }

  /**
   * Adjusts the offset value based on the selection movement.
   * Ensures the selected row is visible and adjusts the offset if necessary.
   * @param state - The current selection state.
   * @param newIndex - The newly calculated index for the selected row.
   * @param direction - The direction of the selection movement (+1 or -1).
   * @returns The adjusted offset value.
   */
  private _adjustOffsetForSelection(
    state: SelectionState,
    newIndex: number,
    direction: number
  ): number {
    let { offset } = state;

    if (direction < 0 && newIndex === 0 && offset > 0) {
      // Scroll up
      offset--;
    } else if (direction > 0 && newIndex === state.rowCount - 1) {
      // Scroll down (only if within range)
      if (offset + newIndex < state.numberOfRecords - 1) {
        offset++;
      }
    }

    return offset;
  }
}
