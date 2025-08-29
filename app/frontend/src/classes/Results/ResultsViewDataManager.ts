import { storeManager } from '../../store/StoreManager';
import { ResultsRowView } from './ResultsRowView';
import { TR_HEIGHT, COMMON_FOOTER_HEIGHT } from '../../global.js';

/** 検索メッセージの型定義 */
type SearchMessages = {
  notice?: string;
  warning?: string;
  error?: string;
};

/** 検索ステータスの型定義 */
type SearchStatus = {
  available: number;
  filtered: number;
};

/** カラム設定の型定義 */
type ColumnConfig = {
  id: string;
  isUsed: boolean;
};

/** 表示される染色体領域の型定義 */
type DisplayingRegions = {
  [chromosome: string]: {
    start: number;
    end: number;
  };
};

/** レコードの型定義 */
type Record = {
  chromosome: string;
  start: number;
  [key: string]: any;
};

/** 表示サイズ計算結果の型定義 */
type DisplaySizeCalculation = {
  maxRowCount: number;
  rowCount: number;
  numberOfRecords: number;
  offset: number;
};

/** 定数 */
const DISPLAY_CALCULATION_MARGIN = 2;

/**
 * データ管理を行うクラス
 * 検索結果の表示、ストア連携、行の管理を行う
 */
export class ResultsViewDataManager {
  /** ルート要素 */
  private elm: HTMLElement;
  /** 結果行のビューインスタンス配列 */
  private rows: ResultsRowView[] = [];
  /** ステータス表示要素 */
  private status: HTMLElement;
  /** メッセージ表示要素 */
  private messages: HTMLElement;
  /** テーブルボディ要素 */
  private tbody: HTMLElement;
  /** カラム表示制御用スタイルシート */
  private stylesheet: HTMLStyleElement;

  /**
   * コンストラクタ
   * @param elm - ルート要素
   * @param status - ステータス表示要素
   * @param messages - メッセージ表示要素
   * @param tbody - テーブルボディ要素
   * @param stylesheet - カラム表示制御用スタイルシート
   */
  constructor(
    elm: HTMLElement,
    status: HTMLElement,
    messages: HTMLElement,
    tbody: HTMLElement,
    stylesheet: HTMLStyleElement
  ) {
    this.elm = elm;
    this.status = status;
    this.messages = messages;
    this.tbody = tbody;
    this.stylesheet = stylesheet;
  }

  // ========================================
  // Public Methods
  // ========================================

  /**
   * 結果行の配列を取得
   * @returns 結果行の配列
   */
  get resultRows(): ResultsRowView[] {
    return this.rows;
  }

  /**
   * 表示サイズを更新する
   * @param isTouchDevice - タッチデバイスかどうか
   * @param setTouchElementsPointerEvents - pointer-events制御関数
   */
  updateDisplaySize(
    isTouchDevice: boolean,
    setTouchElementsPointerEvents: (enabled: boolean) => void
  ): void {
    if (this.shouldSkipUpdate()) {
      return;
    }

    const calculation = this.calculateDisplaySize();
    this.ensureRowsExist(calculation.rowCount);
    this.adjustOffset(calculation);
    this.updateRowsWithAnimation(isTouchDevice, setTouchElementsPointerEvents);
  }

  /**
   * オフセットの変更時の処理
   * @param offset - 新しいオフセット値
   */
  handleOffsetChange(offset: number): void {
    if (this.shouldSkipOffsetUpdate()) {
      return;
    }

    const displayingRegions = this.calculateDisplayingRegions();
    if (Object.keys(displayingRegions).length > 0) {
      storeManager.setData('displayingRegionsOnChromosome', displayingRegions);
    }
  }

  /**
   * 検索メッセージの表示
   * @param messages - メッセージオブジェクト
   */
  handleSearchMessages(messages: SearchMessages): void {
    this.messages.innerHTML = '';

    this.appendMessageIfExists(messages.notice, 'notice');
    this.appendMessageIfExists(messages.warning, 'warning');
    this.appendMessageIfExists(messages.error, 'error');
  }

  /**
   * 検索ステータスの表示
   * @param status - ステータスオブジェクト
   */
  handleSearchStatus(status: SearchStatus): void {
    const { available, filtered } = status;

    this.status.innerHTML =
      `The number of available variations is ${available.toLocaleString()} ` +
      `out of <span class="bigger">${filtered.toLocaleString()}</span>.`;

    this.updateNotFoundState(filtered === 0);
  }

  /**
   * 検索結果の表示
   * @param _results - 検索結果（未使用）
   * @param isTouchDevice - タッチデバイスかどうか
   * @param setTouchElementsPointerEvents - pointer-events制御関数
   */
  handleSearchResults(
    _results: any,
    isTouchDevice: boolean,
    setTouchElementsPointerEvents: (enabled: boolean) => void
  ): void {
    // 更新中フラグのチェックを1回だけに
    const isUpdating = storeManager.getData('isStoreUpdating');
    const isFetching = storeManager.getData('isFetching');

    if (isUpdating || isFetching) {
      requestAnimationFrame(() =>
        this.handleSearchResults(
          _results,
          isTouchDevice,
          setTouchElementsPointerEvents
        )
      );
      return;
    }

    if (!this.validateData()) {
      console.warn('データの検証に失敗しました');
      return;
    }

    this.updateDisplaySize(isTouchDevice, setTouchElementsPointerEvents);
  }

  /**
   * カラムの表示／非表示を制御する
   * @param columns - カラム設定の配列
   */
  handleColumnsChange(columns: ColumnConfig[]): void {
    this.clearExistingStyles();
    this.applyColumnStyles(columns);
  }

  /**
   * 選択行を移動する
   * @param direction - 移動方向（+1で下、-1で上）
   */
  shiftSelectedRow(direction: number): void {
    const state = this.getSelectionState();
    const newIndex = this.calculateNewIndex(state, direction);
    const adjustedOffset = this.adjustOffsetForSelection(
      state,
      newIndex,
      direction
    );

    if (adjustedOffset !== state.offset) {
      storeManager.setData('offset', adjustedOffset);
    }

    storeManager.setData('selectedRow', newIndex);
  }

  // ========================================
  // Private Methods
  // ========================================

  /**
   * 更新をスキップすべきかチェックする
   */
  private shouldSkipUpdate(): boolean {
    return storeManager.getData('isFetching');
  }

  /**
   * 表示サイズの計算を行う
   */
  private calculateDisplaySize(): DisplaySizeCalculation {
    const availableHeight = this.calculateAvailableHeight();
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
   * 利用可能な高さを計算する
   */
  private calculateAvailableHeight(): number {
    const karyotypeHeight = storeManager.getData('karyotype')?.height || 0;
    return (
      window.innerHeight -
      this.tbody.getBoundingClientRect().top -
      karyotypeHeight -
      COMMON_FOOTER_HEIGHT -
      DISPLAY_CALCULATION_MARGIN
    );
  }

  /**
   * 必要な行数が確保されているかチェックし、不足分を追加する
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
   * オフセット量を調整する
   */
  private adjustOffset(calculation: DisplaySizeCalculation): void {
    const { maxRowCount, numberOfRecords, offset } = calculation;
    const visibleRecords = numberOfRecords - offset;
    const emptySpace = maxRowCount - visibleRecords;

    if (emptySpace > 0) {
      const newOffset = this.calculateAdjustedOffset(offset, emptySpace);
      storeManager.setData('offset', newOffset);
    }
  }

  /**
   * 調整されたオフセット値を計算する
   */
  private calculateAdjustedOffset(
    currentOffset: number,
    emptySpace: number
  ): number {
    if (currentOffset >= emptySpace) {
      // 上の隙間の方が大きい場合、差分をオフセットにセット
      return currentOffset - emptySpace;
    } else {
      // 下の隙間が大きい場合、オフセット量をゼロに
      return 0;
    }
  }

  /**
   * アニメーションフレーム内で行の更新を実行する
   */
  private updateRowsWithAnimation(
    isTouchDevice: boolean,
    setTouchElementsPointerEvents: (enabled: boolean) => void
  ): void {
    requestAnimationFrame(() => {
      this.rows.forEach((row) => row.updateTableRow());

      if (isTouchDevice) {
        setTouchElementsPointerEvents(false);
      }
    });
  }

  /**
   * オフセット更新をスキップすべきかチェックする
   */
  private shouldSkipOffsetUpdate(): boolean {
    return (
      storeManager.getData('isStoreUpdating') ||
      storeManager.getData('isFetching')
    );
  }

  /**
   * 現在表示中の染色体領域を計算する
   */
  private calculateDisplayingRegions(): DisplayingRegions {
    const rowCount = storeManager.getData('rowCount');
    const chromosomePositions: { [key: string]: number[] } = {};

    // 各行のレコードから染色体位置を収集
    for (let i = 0; i < rowCount; i++) {
      const record = storeManager.getRecordByIndex(i) as Record;

      if (this.isValidRecord(record)) {
        (chromosomePositions[record.chromosome] ??= []).push(record.start);
      }
    }

    return this.convertToRegions(chromosomePositions);
  }

  /**
   * レコードが有効かチェックする
   */
  private isValidRecord(record: any): record is Record {
    return (
      record &&
      typeof record === 'object' &&
      typeof record.chromosome === 'string' &&
      typeof record.start === 'number'
    );
  }

  /**
   * 染色体位置の配列を領域オブジェクトに変換する
   */
  private convertToRegions(chromosomePositions: {
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
   * メッセージが存在する場合にDOMに追加する
   */
  private appendMessageIfExists(
    message: string | undefined,
    type: string
  ): void {
    if (message) {
      this.messages.innerHTML += `<div class="message -${type}">${message}</div>`;
    }
  }

  /**
   * 検索結果が見つからない状態のUI更新
   */
  private updateNotFoundState(isNotFound: boolean): void {
    if (isNotFound) {
      this.elm.classList.add('-not-found');
    } else {
      this.elm.classList.remove('-not-found');
    }
  }

  /**
   * データの妥当性を検証する
   * @returns 検証結果
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
   * 既存のスタイルをクリアする
   */
  private clearExistingStyles(): void {
    const sheet = this.stylesheet.sheet;
    if (!sheet) return;

    while (sheet.cssRules.length > 0) {
      sheet.deleteRule(0);
    }
  }

  /**
   * カラムスタイルを適用する
   */
  private applyColumnStyles(columns: ColumnConfig[]): void {
    const sheet = this.stylesheet.sheet;
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

  /**
   * 現在の選択状態を取得する
   */
  private getSelectionState() {
    return {
      currentIndex: storeManager.getData('selectedRow'),
      rowCount: storeManager.getData('rowCount'),
      offset: storeManager.getData('offset'),
      numberOfRecords: storeManager.getData('numberOfRecords'),
    };
  }

  /**
   * 新しい選択インデックスを計算する
   */
  private calculateNewIndex(state: any, direction: number): number {
    const newIndex = state.currentIndex + direction;
    return Math.max(0, Math.min(newIndex, state.rowCount - 1));
  }

  /**
   * 選択に応じてオフセットを調整する
   */
  private adjustOffsetForSelection(
    state: any,
    newIndex: number,
    direction: number
  ): number {
    let { offset } = state;

    if (direction < 0 && newIndex === 0 && offset > 0) {
      // 上にスクロール
      offset--;
    } else if (direction > 0 && newIndex === state.rowCount - 1) {
      // 下にスクロール（範囲内の場合のみ）
      if (offset + newIndex < state.numberOfRecords - 1) {
        offset++;
      }
    }

    return offset;
  }
}
