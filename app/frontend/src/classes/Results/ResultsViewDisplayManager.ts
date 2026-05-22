import { storeManager } from '../../store/StoreManager';
import { ResultsRowView } from './ResultsRowView';
import { TR_HEIGHT, COMMON_FOOTER_HEIGHT } from '../../global';
import type { ColumnConfig, DisplaySizeCalculation } from '../../types';

const DISPLAY_CALCULATION_MARGIN = 2;
type ResultsRenderReason = 'layout' | 'searchResults';

export class ResultsViewDisplayManager {
  private _rows: ResultsRowView[] = []; // Array of result row view instances
  private _tbody: HTMLElement; // Table body element
  private _stylesheet: HTMLStyleElement; // Stylesheet for column display control
  private _table: HTMLElement | null; // Results table element
  private _columnStyleSignature = '';

  constructor(tbody: HTMLElement, stylesheet: HTMLStyleElement) {
    this._tbody = tbody;
    this._stylesheet = stylesheet;
    this._table = tbody.closest<HTMLElement>('table.results-view');
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
    setTouchElementsPointerEvents: (_enabled: boolean) => void,
    renderReason: ResultsRenderReason = 'layout'
  ): void {
    if (this._shouldSkipUpdate()) {
      return;
    }

    const calculation = this._calculateDisplaySize();
    this._ensureRowsExist(calculation.rowCount);
    this._adjustOffset(calculation);
    this._updateRowsWithAnimation(
      isTouchDevice,
      setTouchElementsPointerEvents,
      renderReason
    );
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

    this.updateDisplaySize(
      isTouchDevice,
      setTouchElementsPointerEvents,
      'searchResults'
    );
  }

  /**
   * Controls the visibility of columns in the results table.
   * Applies styles to show or hide columns based on the provided configuration.
   * @param columns - Array of column configuration objects.
   */
  handleColumnsChange(columns: ColumnConfig[]): void {
    this._ensureColumnStyleRules(columns);
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
    setTouchElementsPointerEvents: (_enabled: boolean) => void,
    renderReason: ResultsRenderReason
  ): void {
    requestAnimationFrame(() => {
      this._rows.forEach((row) => row.updateTableRow());

      if (isTouchDevice) {
        setTouchElementsPointerEvents(false);
      }

      window.dispatchEvent(
        new CustomEvent('togovar:results-rendered', {
          detail: { reason: renderReason },
        })
      );
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
   * Ensures the static column CSS rules exist.
   * Width and display values are updated through CSS custom properties.
   * @param columns - The array of column configuration objects.
   */
  private _ensureColumnStyleRules(columns: ColumnConfig[]): void {
    const signature = columns.map((column) => column.id).join('|');
    if (signature === this._columnStyleSignature) return;

    this._stylesheet.textContent = columns
      .map((column) => {
        const displayProperty = `--results-column-${column.id}-display`;
        const widthProperty = `--results-column-${column.id}-width`;
        const headerRule =
          `.tablecontainer > table.results-view th.${column.id} { ` +
          `display: var(${displayProperty}, table-cell); ` +
          `width: var(${widthProperty}, auto); ` +
          `min-width: var(${widthProperty}, 0); ` +
          `max-width: var(${widthProperty}, none); ` +
          '}';
        const bodyRule =
          `.tablecontainer > table.results-view td.${column.id} { ` +
          `display: var(${displayProperty}, table-cell); ` +
          `width: var(${widthProperty}, auto); ` +
          `min-width: var(${widthProperty}, 0); ` +
          `max-width: var(${widthProperty}, none); ` +
          '}';

        return `${headerRule}\n${bodyRule}`;
      })
      .join('\n');
    this._columnStyleSignature = signature;
  }

  /**
   * Applies column display and width values without rebuilding CSS rules.
   * @param columns - The array of column configuration objects.
   */
  private _applyColumnStyles(columns: ColumnConfig[]): void {
    if (!this._table) return;

    columns.forEach((column) => {
      const displayProperty = `--results-column-${column.id}-display`;
      const widthProperty = `--results-column-${column.id}-width`;

      this._table?.style.setProperty(
        displayProperty,
        column.isUsed ? 'table-cell' : 'none'
      );

      if (typeof column.width === 'number') {
        this._table?.style.setProperty(widthProperty, `${column.width}px`);
      } else {
        this._table?.style.removeProperty(widthProperty);
      }
    });
  }
}
