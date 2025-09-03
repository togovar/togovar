import { storeManager } from '../../store/StoreManager';
import { TR_HEIGHT } from '../../global.js';
import { DragEventUI } from '../../types';
import { ScrollCalculator, ScrollBarRenderer, DragManager } from './scroll';

// ================================================================
// MAIN CLASS
// ================================================================

/**
 * Results専用スクロールバーコンポーネント（リファクタリング版）
 *
 * ## Features
 * - Results表示に特化したスクロール処理
 * - マウス・タッチドラッグ対応
 * - 自動位置計算とフィードバック
 * - パフォーマンス最適化済み
 * - 責任分離によるモジュラー設計
 *
 * ## Usage
 * ```typescript
 * const scrollbar = new ResultsScrollBar(containerElement);
 *
 * // ページ遷移時やコンポーネント削除時には必ずcleanupを実行
 * window.addEventListener('beforeunload', () => {
 *   scrollbar.destroy(); // メモリリーク防止
 * });
 *
 * // または、コンポーネントのライフサイクルに合わせて
 * someComponent.onDestroy(() => {
 *   scrollbar.destroy();
 * });
 * ```
 */
export default class ResultsScrollBar {
  // ================================================================
  // PROPERTIES
  // ================================================================

  /** Container element for the scrollbar */
  private readonly _container: HTMLElement;
  /** Main scrollbar element */
  private readonly _scrollBarElement: HTMLElement;
  /** Display element for current position */
  private readonly _positionDisplay: HTMLElement;
  /** Display element for total count */
  private readonly _totalDisplay: HTMLElement;

  /** Last scroll position for delta calculations */
  private _lastScrollPosition: number = 0;

  // 分離されたコンポーネント
  private readonly _calculator: ScrollCalculator;
  private readonly _renderer: ScrollBarRenderer;
  private readonly _dragManager: DragManager;

  // ================================================================
  // CONSTRUCTOR & INITIALIZATION
  // ================================================================

  /**
   * Creates a new ResultsScrollBar instance
   * @param containerElement - The container element where the scrollbar will be inserted
   */
  constructor(containerElement: HTMLElement) {
    this._container = containerElement;

    // HTML構造を作成
    ScrollBarRenderer.createScrollBarHTML(this._container);

    // DOM要素を取得
    const elements = ScrollBarRenderer.initializeElements(this._container);
    this._scrollBarElement = elements.scrollBar;
    this._positionDisplay = elements.position;
    this._totalDisplay = elements.total;

    // コンポーネントを初期化
    this._calculator = new ScrollCalculator();
    this._renderer = new ScrollBarRenderer(
      this._container,
      this._scrollBarElement,
      this._positionDisplay,
      this._totalDisplay
    );
    this._dragManager = new DragManager({
      scrollBarElement: this._scrollBarElement,
      container: this._container,
      onDragCallback: this._handleDrag.bind(this),
      onVisualStateChange: this._handleVisualStateChange.bind(this),
    });

    this._bindStoreEvents();
    this._renderer.initializeCursor(); // カーソル初期化をレンダラーで実行
    this._dragManager.initializeDragManager();
  }

  /**
   * Binds this component to store events
   */
  private _bindStoreEvents(): void {
    storeManager.bind('offset', this);
    storeManager.bind('numberOfRecords', this);
    storeManager.bind('rowCount', this);
  }

  // ================================================================
  // PUBLIC API - Store Event Handlers
  // ================================================================

  /**
   * Handles drag operation and updates the scroll position in store
   * @param e - The original event (can be null for programmatic calls)
   * @param ui - Object containing the drag position information
   */
  onDrag(e: Event | null, ui: DragEventUI): void {
    const rowCount = storeManager.getData('rowCount') as number;
    const numberOfRecords = storeManager.getData('numberOfRecords') as number;
    const availableHeight =
      rowCount * TR_HEIGHT - this._scrollBarElement.offsetHeight * 0;
    const offsetRate = ui.position.top / availableHeight;

    let offset = Math.ceil(offsetRate * numberOfRecords);
    offset = this._calculator.clampOffsetToValidRange(
      offset,
      rowCount,
      numberOfRecords
    );

    // 重要: _lastScrollPositionを更新してトラックパッドスクロールとの整合性を保つ
    this._lastScrollPosition = offset * TR_HEIGHT;

    storeManager.setData('offset', offset);
    this._renderer.scheduleVisualStateRelease();
  }

  /**
   * Updates the displayed position when the offset changes
   * @param offset - The new offset value (0-based index)
   */
  offset(offset: number): void {
    this._renderer.updatePositionDisplay(offset);
    this._updateScrollBarAppearance();

    // Maintain active state on touch devices
    if (
      window.matchMedia('(hover: none) and (pointer: coarse)').matches &&
      this._container.classList.contains('-active')
    ) {
      return;
    }
  }

  /**
   * Updates the total number of records displayed
   * @param numberOfRecords - The total count of records
   */
  numberOfRecords(numberOfRecords: number): void {
    this._renderer.updateTotalDisplay(numberOfRecords);
    this._updateScrollBarAppearance();
  }

  /**
   * Handles row count changes and triggers a UI update
   */
  rowCount(): void {
    this._updateScrollBarAppearance();
  }

  // ================================================================
  // PUBLIC API - Results-specific methods
  // ================================================================

  /**
   * Deactivate the scrollbar visual state
   */
  deactivate(): void {
    this._renderer.deactivate();
  }

  /**
   * Initialize scrollbar position
   */
  initializePosition(): void {
    this._renderer.activate();
  }

  /**
   * Clean up all resources and prevent memory leaks
   * Call this method when the scrollbar component is no longer needed
   */
  destroy(): void {
    // 1. DragManagerのクリーンアップ（最も重要）
    this._dragManager.destroyDragManager();

    // 2. StoreManagerのイベントバインディング解除
    storeManager.unbind('offset', this);
    storeManager.unbind('numberOfRecords', this);
    storeManager.unbind('rowCount', this);

    // 3. Rendererのタイマークリーンアップ
    this._renderer.clearTimeouts();

    // 4. DOM要素からのスクロールバー削除（オプション）
    const scrollBarContainer = this._container.querySelector(
      '.scrollbar-container'
    );
    if (scrollBarContainer) {
      scrollBarContainer.remove();
    }
  }

  /**
   * Handle scroll with scrollbar feedback (for touch events)
   * @param deltaY - Y delta value
   * @param touchStartOffset - Starting offset when touch began
   */
  handleScrollWithFeedback(deltaY: number, touchStartOffset: number): void {
    const rowCount = storeManager.getData('rowCount') as number;
    const numberOfRecords = storeManager.getData('numberOfRecords') as number;

    const newOffset = this._calculator.calculateTouchScrollOffset(
      deltaY,
      touchStartOffset,
      rowCount,
      numberOfRecords
    );
    const boundedOffset = this._calculator.clampOffsetToValidRange(
      newOffset,
      rowCount,
      numberOfRecords
    );

    this._lastScrollPosition = boundedOffset * TR_HEIGHT;
    storeManager.setData('offset', boundedOffset);
    this.updateDirectly(boundedOffset);
  }

  /**
   * Handle simple scroll (for wheel events)
   * @param deltaY - Y delta value
   */
  handleScroll(deltaY: number): void {
    const numberOfRecords = storeManager.getData('numberOfRecords') as number;
    const rowCount = storeManager.getData('rowCount') as number;

    const calculation = this._calculator.calculateScrollPosition(
      deltaY,
      this._lastScrollPosition,
      numberOfRecords,
      rowCount
    );

    if (calculation.newScrollPosition === this._lastScrollPosition) {
      return;
    }

    this._lastScrollPosition = calculation.newScrollPosition;
    const offset = this._calculator.calculateOffsetFromScroll(
      this._lastScrollPosition
    );
    storeManager.setData('offset', offset);
  }

  /**
   * Update scrollbar directly with specific offset
   * @param offset - Offset value
   */
  updateDirectly(offset: number): void {
    const rowCount = storeManager.getData('rowCount') as number;
    const numberOfRecords = storeManager.getData('numberOfRecords') as number;

    const calculation = this._calculator.calculateScrollBarPosition(
      offset,
      rowCount,
      numberOfRecords
    );
    this._renderer.applyScrollBarStyles(calculation, offset);
  }

  // ================================================================
  // PRIVATE - Visual Updates
  // ================================================================

  /**
   * Updates the scrollbar appearance based on current data store values
   */
  private _updateScrollBarAppearance(): void {
    const offset = storeManager.getData('offset') as number;
    const rowCount = storeManager.getData('rowCount') as number;
    const numberOfRecords = storeManager.getData('numberOfRecords') as number;

    const calculation = this._calculator.calculateScrollBarPosition(
      offset,
      rowCount,
      numberOfRecords
    );

    this._renderer.updateScrollBarAppearance(
      calculation,
      rowCount,
      numberOfRecords
    );
  }

  // ================================================================
  // PRIVATE - Drag Event Handlers
  // ================================================================

  /**
   * ドラッグイベントを処理
   * @param top - ドラッグ位置
   */
  private _handleDrag(top: number): void {
    // レンダラーでスクロールバー位置を更新
    this._renderer.updateScrollBarPosition(top);

    const mockEvent: DragEventUI = { position: { top } };
    this.onDrag(null, mockEvent);
  }

  /**
   * 視覚的状態の変更を処理
   * @param isDragging - ドラッグ中かどうか
   */
  private _handleVisualStateChange(isDragging: boolean): void {
    this._renderer.setCursorStyle(isDragging);
    this._renderer.setDraggingState(isDragging);
  }
}
