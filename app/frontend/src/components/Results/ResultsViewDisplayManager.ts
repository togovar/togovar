import { storeManager } from '../../store/StoreManager';
import { ResultsRowView } from './ResultsRowView';
import { TR_HEIGHT } from '../../global';
import type { ColumnConfig, DisplaySizeCalculation } from '../../types';

const DISPLAY_CALCULATION_MARGIN = 2;
type ResultsRenderReason = 'layout' | 'searchResults';

export class ResultsViewDisplayManager {
  private rows: ResultsRowView[] = [];
  private tbody: HTMLElement;
  private stylesheet: HTMLStyleElement;
  private stylesheetVars: HTMLStyleElement;
  private tableContainer: HTMLElement | null;
  private columnStyleSignature = '';
  private rowUpdateFrameId: number | null = null;
  private pendingRenderReason: ResultsRenderReason = 'layout';
  private pendingIsTouchDevice = false;
  private pendingSetTouchElementsPointerEvents:
    | ((_enabled: boolean) => void)
    | null = null;

  constructor(tbody: HTMLElement, stylesheet: HTMLStyleElement) {
    this.tbody = tbody;
    this.stylesheet = stylesheet;
    this.stylesheetVars = document.createElement('style');
    document.head.appendChild(this.stylesheetVars);
    this.tableContainer = tbody.closest<HTMLElement>('.tablecontainer');
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
    if (this.shouldSkipUpdate()) {
      return;
    }

    const calculation = this.calculateDisplaySize();
    this.ensureRowsExist(calculation.rowCount);
    this.adjustOffset(calculation);
    this.updateRowsWithAnimation(
      isTouchDevice,
      setTouchElementsPointerEvents,
      renderReason
    );
  }

  /**
   * data取得中またはStore配列更新中の中途状態を避け、完了後に検索結果を描画する。
   */
  handleSearchResults(
    isTouchDevice: boolean,
    setTouchElementsPointerEvents: (_enabled: boolean) => void
  ): void {
    const isSearchResultsUpdating = storeManager.getData('isSearchResultsUpdating');
    const isSearchDataFetching = storeManager.getData('isSearchDataFetching');

    if (isSearchResultsUpdating || isSearchDataFetching) {
      requestAnimationFrame(() =>
        this.handleSearchResults(isTouchDevice, setTouchElementsPointerEvents)
      );
      return;
    }

    if (!this.validateData()) {
      console.warn('Data validation failed');
      return;
    }

    this.updateDisplaySize(isTouchDevice, setTouchElementsPointerEvents, 'searchResults');
  }

  /**
   * 列定義が変わるたびにルールと変数宣言を更新する。
   * ルールは列IDが変わった時だけ再生成し、変数宣言は毎回上書きする。
   */
  handleColumnsChange(columns: ColumnConfig[]): void {
    this.ensureColumnStyleRules(columns);
    this.applyColumnStyles(columns);
  }

  /**
   * offset連続更新を1フレームにまとめ、スクロール中の同期DOM更新を避ける。
   */
  requestRowsUpdate(
    isTouchDevice: boolean,
    setTouchElementsPointerEvents: (_enabled: boolean) => void,
    renderReason: ResultsRenderReason = 'layout'
  ): void {
    this.updateRowsWithAnimation(
      isTouchDevice,
      setTouchElementsPointerEvents,
      renderReason
    );
  }

  /** 行Viewと遅延描画を残すと破棄後にStore参照が続くため、まとめて解除する。 */
  destroy(): void {
    if (this.rowUpdateFrameId !== null) {
      cancelAnimationFrame(this.rowUpdateFrameId);
      this.rowUpdateFrameId = null;
    }
    this.rows.forEach((row) => row.destroy());
    this.rows = [];
    this.stylesheetVars.remove();
  }

  // ========================================
  // Private Methods
  // ========================================

  /**
   * data取得中はResults側の行描画を待たせ、未取得行のloading増殖を防ぐ。
   */
  private shouldSkipUpdate(): boolean {
    return storeManager.getData('isSearchDataFetching');
  }

  /**
   * 表示可能な高さと総件数から、Storeへ共有する表示行数を一箇所で決める。
   */
  private calculateDisplaySize(): DisplaySizeCalculation {
    const availableHeight = this.calculateAvailableHeight();
    const maxRowCount = Math.max(0, Math.floor(availableHeight / TR_HEIGHT));
    const numberOfRecords = storeManager.getData('numberOfRecords');
    const offset = storeManager.getData('offset');
    const rowCount = Math.min(maxRowCount, numberOfRecords);

    storeManager.setData('rowCount', rowCount);

    return { maxRowCount, rowCount, numberOfRecords, offset };
  }

  private calculateAvailableHeight(): number {
    const tbodyTop = this.tbody.getBoundingClientRect().top;
    const containerBottom = this.tableContainer?.getBoundingClientRect().bottom ?? 0;
    const paddingBottom = this.getPixelStyle(this.tableContainer, 'padding-bottom');
    return containerBottom - tbodyTop - paddingBottom - DISPLAY_CALCULATION_MARGIN;
  }

  /**
   * 仮想スクロールで再利用する行Viewは、不足分だけ増やして既存行を作り直さない。
   */
  private ensureRowsExist(requiredRowCount: number): void {
    while (this.rows.length < requiredRowCount) {
      const rowIndex = this.rows.length;
      const rowView = new ResultsRowView(rowIndex);
      this.rows.push(rowView);
      this.tbody.appendChild(rowView.tr);
    }
  }

  /**
   * 末尾付近で空白が出ないよう、表示可能行数に合わせてoffsetを上方向へ詰める。
   */
  private adjustOffset(calculation: DisplaySizeCalculation): void {
    const { maxRowCount, numberOfRecords, offset } = calculation;
    const emptySpace = maxRowCount - (numberOfRecords - offset);

    if (emptySpace > 0) {
      storeManager.setData('offset', this.calculateAdjustedOffset(offset, emptySpace));
    }
  }

  /**
   * offsetは負にできないため、空白量が現在offsetを超える場合は先頭へ戻す。
   */
  private calculateAdjustedOffset(currentOffset: number, emptySpace: number): number {
    return currentOffset >= emptySpace ? currentOffset - emptySpace : 0;
  }

  /**
   * DOM更新を次フレームへまとめ、行更新後に後続UIへ描画完了イベントを通知する。
   */
  private updateRowsWithAnimation(
    isTouchDevice: boolean,
    setTouchElementsPointerEvents: (_enabled: boolean) => void,
    renderReason: ResultsRenderReason
  ): void {
    this.pendingIsTouchDevice = isTouchDevice;
    this.pendingSetTouchElementsPointerEvents = setTouchElementsPointerEvents;
    this.pendingRenderReason =
      this.pendingRenderReason === 'searchResults' ? 'searchResults' : renderReason;

    if (this.rowUpdateFrameId !== null) return;

    this.rowUpdateFrameId = requestAnimationFrame(() => {
      const shouldResetTouchPointerEvents = this.pendingIsTouchDevice;
      const pointerEventsCallback = this.pendingSetTouchElementsPointerEvents;
      const nextRenderReason = this.pendingRenderReason;

      this.rowUpdateFrameId = null;
      this.pendingRenderReason = 'layout';
      this.pendingSetTouchElementsPointerEvents = null;

      this.rows.forEach((row) => row.updateTableRow());

      if (shouldResetTouchPointerEvents && pointerEventsCallback) {
        pointerEventsCallback(false);
      }

      window.dispatchEvent(
        new CustomEvent('togovar:results-rendered', {
          detail: { reason: nextRenderReason },
        })
      );
    });
  }

  /**
   * Store由来の値は外部更新されるため、描画前に最低限の構造だけ確認する。
   */
  private validateData(): boolean {
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
  private ensureColumnStyleRules(columns: ColumnConfig[]): void {
    const signature = columns.map((col) => col.id).join('|');
    if (signature === this.columnStyleSignature) return;

    this.stylesheet.textContent = columns
      .map((col) => {
        const d = `--results-column-${col.id}-display`;
        const w = `--results-column-${col.id}-width`;
        const shared = `display: var(${d}, table-cell); width: var(${w}); min-width: var(${w}); max-width: var(${w});`;
        return [
          `.tablecontainer > table.results-view th.${col.id} { ${shared} }`,
          `.tablecontainer > table.results-view td.${col.id} { ${shared} }`,
        ].join('\n');
      })
      .join('\n');

    this.columnStyleSignature = signature;
  }

  /**
   * 列の表示状態と幅を CSS 変数宣言として stylesheetVars に書き込む。
   * `<table>` の inline style ではなく独立した `<style>` 要素に持たせることで
   * DevTools での確認を容易にし、inline style 属性を空に保つ。
   */
  private applyColumnStyles(columns: ColumnConfig[]): void {
    const declarations = columns.flatMap((col) => {
      const lines = [
        `  --results-column-${col.id}-display: ${col.isUsed ? 'table-cell' : 'none'}`,
      ];
      if (typeof col.width === 'number') {
        lines.push(`  --results-column-${col.id}-width: ${col.width}px`);
      }
      return lines;
    });

    this.stylesheetVars.textContent =
      `.tablecontainer > table.results-view {\n${declarations.join(';\n')};\n}`;
  }

  /**
   * CSSの余白値は文字列なので、計算可能なpx値だけを数値として使う。
   */
  private getPixelStyle(elm: HTMLElement | null, property: string): number {
    if (!elm) return 0;
    const raw = getComputedStyle(elm).getPropertyValue(property).trim();
    if (!raw.endsWith('px')) return 0;
    const value = Number.parseFloat(raw);
    return Number.isNaN(value) ? 0 : value;
  }
}
