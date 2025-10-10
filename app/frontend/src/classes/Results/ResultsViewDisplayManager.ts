import { storeManager } from '../../store/StoreManager';
import { ResultsRowView } from './ResultsRowView';
import { TR_HEIGHT, COMMON_FOOTER_HEIGHT } from '../../global';
import type { ColumnConfig, DisplaySizeCalculation } from '../../types';

const DISPLAY_CALCULATION_MARGIN = 2;

export class ResultsViewDisplayManager {
  private _rows: ResultsRowView[] = []; // Array of result row view instances
  private _tbody: HTMLElement; // Table body element
  private _stylesheet: HTMLStyleElement; // Stylesheet for column display control

  constructor(tbody: HTMLElement, stylesheet: HTMLStyleElement) {
    this._tbody = tbody;
    this._stylesheet = stylesheet;
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
    if (this._shouldSkipUpdate()) {
      return;
    }

    const calculation = this._calculateDisplaySize();
    this._ensureRowsExist(calculation.rowCount);
    this._adjustOffset(calculation);
    this._updateRowsWithAnimation(isTouchDevice, setTouchElementsPointerEvents);
  }

  /**
   * Handles the display of search results.
   * Validates data, updates the display size, and manages animations.
   * Retries if data is being updated or fetched.
   * @param isTouchDevice - Whether the device supports touch input.
   * @param setTouchElementsPointerEvents - Function to control pointer-events for touch elements.
   */
  handleSearchResults(
    isTouchDevice: boolean,
    setTouchElementsPointerEvents: (_enabled: boolean) => void
  ): void {
    // Check update flags only once
    const isUpdating = storeManager.getData('isStoreUpdating');
    const isFetching = storeManager.getData('isFetching');

    if (isUpdating || isFetching) {
      requestAnimationFrame(() =>
        this.handleSearchResults(isTouchDevice, setTouchElementsPointerEvents)
      );
      return;
    }

    if (!this._validateData()) {
      console.warn('Data validation failed');
      return;
    }

    this.updateDisplaySize(isTouchDevice, setTouchElementsPointerEvents);
  }

  /**
   * Controls the visibility of columns in the results table.
   * Applies styles to show or hide columns based on the provided configuration.
   * @param columns - Array of column configuration objects.
   */
  handleColumnsChange(columns: ColumnConfig[]): void {
    this._clearExistingStyles();
    this._applyColumnStyles(columns);
  }

  // ========================================
  // Private Methods
  // ========================================

  /**
   * Checks if the update should be skipped.
   * @returns True if the update should be skipped, false otherwise.
   */
  private _shouldSkipUpdate(): boolean {
    return storeManager.getData('isFetching');
  }

  /**
   * Calculates the display size based on the available height and number of records.
   * @returns An object containing the calculated display size parameters.
   */
  private _calculateDisplaySize(): DisplaySizeCalculation {
    const availableHeight = this._calculateAvailableHeight();
    const maxRowCount = Math.floor(availableHeight / TR_HEIGHT);
    const numberOfRecords = storeManager.getData('numberOfRecords');
    const offset = storeManager.getData('offset');
    const rowCount = Math.min(maxRowCount, numberOfRecords);

    storeManager.setData('rowCount', rowCount);

    return {
      maxRowCount,
      rowCount,
      numberOfRecords,
      offset,
    };
  }

  /**
   * Calculates the available height for the results view.
   * Considers the karyotype height, footer height, and a margin.
   * @returns The calculated available height in pixels.
   */
  private _calculateAvailableHeight(): number {
    const karyotypeHeight = storeManager.getData('karyotype')?.height || 0;
    return (
      window.innerHeight -
      this._tbody.getBoundingClientRect().top -
      karyotypeHeight -
      COMMON_FOOTER_HEIGHT -
      DISPLAY_CALCULATION_MARGIN
    );
  }

  /**
   * Ensures that the required number of rows exist in the view.
   * Adds new row instances if necessary.
   * @param requiredRowCount - The number of rows that should be present.
   */
  private _ensureRowsExist(requiredRowCount: number): void {
    while (this._rows.length < requiredRowCount) {
      const rowIndex = this._rows.length;
      const rowView = new ResultsRowView(rowIndex);
      this._rows.push(rowView);
      this._tbody.appendChild(rowView.tr);
    }
  }

  /**
   * Adjusts the offset value based on the display size calculation.
   * Ensures that enough records are visible and adjusts the offset if there is empty space.
   * @param calculation - The display size calculation result.
   */
  private _adjustOffset(calculation: DisplaySizeCalculation): void {
    const { maxRowCount, numberOfRecords, offset } = calculation;
    const visibleRecords = numberOfRecords - offset;
    const emptySpace = maxRowCount - visibleRecords;

    if (emptySpace > 0) {
      const newOffset = this._calculateAdjustedOffset(offset, emptySpace);
      storeManager.setData('offset', newOffset);
    }
  }

  /**
   * Calculates the adjusted offset value to avoid empty space in the results view.
   * @param currentOffset - The current offset value.
   * @param emptySpace - The amount of empty space detected.
   * @returns The adjusted offset value.
   */
  private _calculateAdjustedOffset(
    currentOffset: number,
    emptySpace: number
  ): number {
    if (currentOffset >= emptySpace) {
      // If the upper gap is larger, set the difference to offset
      return currentOffset - emptySpace;
    } else {
      // If the lower gap is larger, set offset to zero
      return 0;
    }
  }

  /**
   * Executes row updates within an animation frame.
   * Calls the updateTableRow method on each row instance.
   * @param isTouchDevice - Whether the device supports touch input.
   * @param setTouchElementsPointerEvents - Function to control pointer-events for touch elements.
   */
  private _updateRowsWithAnimation(
    isTouchDevice: boolean,
    setTouchElementsPointerEvents: (_enabled: boolean) => void
  ): void {
    requestAnimationFrame(() => {
      this._rows.forEach((row) => row.updateTableRow());

      if (isTouchDevice) {
        setTouchElementsPointerEvents(false);
      }
    });
  }

  /**
   * Validates the integrity and structure of the data.
   * @returns True if the data is valid, false otherwise.
   */
  private _validateData(): boolean {
    const results = storeManager.getData('searchResults');
    const numberOfRecords = storeManager.getData('numberOfRecords');

    return (
      Array.isArray(results) &&
      typeof numberOfRecords === 'number' &&
      numberOfRecords >= 0
    );
  }

  /**
   * Clears existing styles from the stylesheet.
   * Removes all CSS rules to prepare for new column styles.
   */
  private _clearExistingStyles(): void {
    const sheet = this._stylesheet.sheet;
    if (!sheet) return;

    while (sheet.cssRules.length > 0) {
      sheet.deleteRule(0);
    }
  }

  /**
   * Applies column styles based on the provided configuration.
   * Inserts CSS rules for each column to show or hide them as needed.
   * @param columns - The array of column configuration objects.
   */
  private _applyColumnStyles(columns: ColumnConfig[]): void {
    const sheet = this._stylesheet.sheet;
    if (!sheet) return;

    columns.forEach((column, index) => {
      const displayValue = column.isUsed ? 'table-cell' : 'none';
      const rule =
        `.tablecontainer > table.results-view th.${column.id}, ` +
        `.tablecontainer > table.results-view td.${column.id} { ` +
        `display: ${displayValue} }`;

      sheet.insertRule(rule, index);
    });
  }
}
