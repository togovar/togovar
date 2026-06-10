import { storeManager } from '../../store/StoreManager';
import { ResultsRowView } from './ResultsRowView';
import { TR_HEIGHT } from '../../global';
import type { ColumnConfig, DisplaySizeCalculation } from '../../types';

const DISPLAY_CALCULATION_MARGIN = 2;
type ResultsRenderReason = 'layout' | 'searchResults';

export class ResultsViewDisplayManager {
  private _rows: ResultsRowView[] = [];
  private _tbody: HTMLElement;
  private _stylesheet: HTMLStyleElement;
  private _table: HTMLElement | null;
  private _tableContainer: HTMLElement | null;
  private _columnStyleSignature = '';

  constructor(tbody: HTMLElement, stylesheet: HTMLStyleElement) {
    this._tbody = tbody;
    this._stylesheet = stylesheet;
    this._table = tbody.closest<HTMLElement>('table.results-view');
    this._tableContainer = tbody.closest<HTMLElement>('.tablecontainer');
  }

  // ========================================
  // Display Management
  // ========================================

  /**
   * レイアウト変更や検索結果更新のたびに、親領域へ収まる行数だけを描画する。
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
   * Store更新中の中途半端なデータで行を描画しないよう、更新完了後に検索結果を反映する。
   */
  handleSearchResults(
    isTouchDevice: boolean,
    setTouchElementsPointerEvents: (_enabled: boolean) => void
  ): void {
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
   * 列表示はCSS変数で切り替えるため、列定義の変更時だけルール生成と値更新を行う。
   */
  handleColumnsChange(columns: ColumnConfig[]): void {
    this._ensureColumnStyleRules(columns);
    this._applyColumnStyles(columns);
  }

  // ========================================
  // Private Methods
  // ========================================

  /**
   * 取得中の検索結果で表示行数を更新するとちらつくため、fetch中は更新を待つ。
   */
  private _shouldSkipUpdate(): boolean {
    return storeManager.getData('isFetching');
  }

  /**
   * 表示可能な高さと総件数から、Storeへ共有する表示行数を一箇所で決める。
   */
  private _calculateDisplaySize(): DisplaySizeCalculation {
    const availableHeight = this._calculateAvailableHeight();
    const maxRowCount = Math.max(0, Math.floor(availableHeight / TR_HEIGHT));
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

  private _calculateAvailableHeight(): number {
    const tbodyTop = this._tbody.getBoundingClientRect().top;
    const containerBottom = this._tableContainer?.getBoundingClientRect().bottom ?? 0;
    const paddingBottom = this._getPixelStyle(this._tableContainer, 'padding-bottom');
    return containerBottom - tbodyTop - paddingBottom - DISPLAY_CALCULATION_MARGIN;
  }

  /**
   * 仮想スクロールで再利用する行Viewは、不足分だけ増やして既存行を作り直さない。
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
   * 末尾付近で空白が出ないよう、表示可能行数に合わせてoffsetを上方向へ詰める。
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
   * offsetは負にできないため、空白量が現在offsetを超える場合は先頭へ戻す。
   */
  private _calculateAdjustedOffset(
    currentOffset: number,
    emptySpace: number
  ): number {
    if (currentOffset >= emptySpace) {
      return currentOffset - emptySpace;
    } else {
      return 0;
    }
  }

  /**
   * DOM更新を次フレームへまとめ、行更新後に後続UIへ描画完了イベントを通知する。
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
   * Store由来の値は外部更新されるため、描画前に最低限の構造だけ確認する。
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
   * 列ごとのCSSルールは列ID構成が変わったときだけ再生成し、通常更新のコストを抑える。
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
          `width: var(${widthProperty}); ` +
          `min-width: var(${widthProperty}); ` +
          `max-width: var(${widthProperty}); ` +
          '}';
        const bodyRule =
          `.tablecontainer > table.results-view td.${column.id} { ` +
          `display: var(${displayProperty}, table-cell); ` +
          `width: var(${widthProperty}); ` +
          `min-width: var(${widthProperty}); ` +
          `max-width: var(${widthProperty}); ` +
          '}';

        return `${headerRule}\n${bodyRule}`;
      })
      .join('\n');
    this._columnStyleSignature = signature;
  }

  /**
   * 列幅と表示状態はCSS変数だけを更新し、生成済みルールを使い回す。
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

  /**
   * CSSの余白値は文字列なので、計算可能なpx値だけを数値として使う。
   */
  private _getPixelStyle(elm: HTMLElement | null, property: string): number {
    if (!elm) return 0;

    const raw = getComputedStyle(elm).getPropertyValue(property).trim();
    if (!raw.endsWith('px')) return 0;
    const value = Number.parseFloat(raw);
    return Number.isNaN(value) ? 0 : value;
  }
}
