/**
 * UI Components & Interaction Type Definitions
 *
 * This module contains type definitions for:
 * - UI component configurations and state
 * - User interaction events and handlers
 * - Layout and display calculations
 * - Touch and scroll behavior types
 * - Visual element properties and styles
 */

// ============================================
// Component Configuration Types
// ============================================

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

// ============================================
// ScrollBar Component Types
// ============================================

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

/** ドラッグマネージャーの設定オプション */
export interface DragManagerConfig {
  scrollBarElement: HTMLElement;
  container: HTMLElement;
  onDragCallback: (_top: number) => void;
  onVisualStateChange: (_isDragging: boolean) => void;
}

/** タッチイベントオプション（タッチハンドリング改善用） */
export interface TouchEventOptions {
  passive: boolean;
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

// ============================================
// Touch Handler Types
// ============================================

/** スクロールコールバックの型定義 */
export interface ScrollCallbacks {
  onScrollStart?: () => void;
  onScroll?: (deltaY: number, startOffset: number) => void;
  onScrollEnd?: () => void;
}

/** タッチ状態の型定義 */
export interface TouchState {
  startY: number;
  startX: number;
  startTime: number;
  lastY: number;
  lastX: number;
  distance: number;
  duration: number;
  isScrolling: boolean;
  startOffset: number;
}

/** タッチ判定結果の型定義 */
export interface TouchGesture {
  isTap: boolean;
  isScroll: boolean;
  deltaY: number;
  deltaX: number;
}
