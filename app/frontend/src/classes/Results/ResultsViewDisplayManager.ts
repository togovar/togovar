import { storeManager } from '../../store/StoreManager';
import { ResultsRowView } from './ResultsRowView';
import { TR_HEIGHT } from '../../global.js';
import { ColumnConfig, DisplaySizeCalculation } from '../../types';

export class ResultsViewDisplayManager {
  private _rows: ResultsRowView[] = [];
  private _tbody: HTMLElement;
  private _stylesheet: HTMLStyleElement;

  constructor(tbody: HTMLElement, stylesheet: HTMLStyleElement) {
    this._tbody = tbody;
    this._stylesheet = stylesheet;
  }

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
    this._updateRowsWithAnimation(isTouchDevice, setTouchElementsPointerEvents);
  }

  /**
   * Handles the display of search results.
   * Validates data, updates the display size, and manages animations.
   * @param isTouchDevice - Whether the device supports touch input.
   * @param setTouchElementsPointerEvents - Function to control pointer-events for touch elements.
   */
  handleSearchResults(
    isTouchDevice: boolean,
    setTouchElementsPointerEvents: (_enabled: boolean) => void
  ): void {
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

  private _shouldSkipUpdate(): boolean {
    return storeManager.getData('isFetching');
  }

  private _calculateDisplaySize(): DisplaySizeCalculation {
    const availableHeight =
      window.innerHeight - this._tbody.getBoundingClientRect().top;
    const maxRowCount = Math.floor(availableHeight / TR_HEIGHT);
    const numberOfRecords = storeManager.getData('numberOfRecords');
    const rowCount = Math.min(maxRowCount, numberOfRecords);

    return { maxRowCount, rowCount, numberOfRecords, offset: 0 };
  }

  private _ensureRowsExist(requiredRowCount: number): void {
    while (this._rows.length < requiredRowCount) {
      const rowIndex = this._rows.length;
      const rowView = new ResultsRowView(rowIndex);
      this._rows.push(rowView);
      this._tbody.appendChild(rowView.tr);
    }
  }

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
