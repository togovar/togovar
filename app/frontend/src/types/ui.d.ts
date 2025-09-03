// -------------------------------------
// UI and Display Types
// -------------------------------------

/** カラム設定の型定義 */
export type ColumnConfig = {
  id: string;
  isUsed: boolean;
};

/** 表示サイズ計算結果の型定義 */
export type DisplaySizeCalculation = {
  maxRowCount: number;
  rowCount: number;
  numberOfRecords: number;
  offset: number;
};

// -------------------------------------
// ScrollBar Types
// -------------------------------------

/** ドラッグ状態を表す型 */
export interface DragState {
  isDragging: boolean;
  startY: number;
  startTop: number;
}

/** ドラッグイベント用UI オブジェクト（位置情報を含む） */
export interface DragEventUI {
  position: {
    top: number;
  };
}

/** スクロール計算結果の型 */
export type ScrollCalculation = {
  totalHeight: number;
  availableScrollY: number;
  newScrollPosition: number;
};

/** スクロールバー計算結果の型 */
export type ScrollBarCalculation = {
  barHeight: number;
  barTop: number;
  displayRate: number;
};

/** スクロール境界の型 */
export type ScrollBounds = {
  min: number;
  max: number;
};
