import { storeManager } from '../../store/StoreManager';
import { TR_HEIGHT } from '../../global.js';

/** スクロール計算結果の型定義 */
type ScrollCalculation = {
  totalHeight: number;
  availableScrollY: number;
  newScrollPosition: number;
};

/** スクロールバーの計算結果の型定義 */
type ScrollBarCalculation = {
  barHeight: number;
  barTop: number;
  displayRate: number;
};

/** スクロール境界の型定義 */
type ScrollBounds = {
  min: number;
  max: number;
};

/** 定数 */
const MIN_SCROLLBAR_HEIGHT = 30;
const DEFAULT_OFFSET = 0;

/**
 * スクロール処理を管理するクラス
 * スクロールバーの制御、スクロール量の計算、表示位置の管理を行う
 */
export class ResultsViewScrollHandler {
  /** ルート要素 */
  private elm: HTMLElement;
  /** 最後のスクロール位置 */
  private lastScroll: number = 0;

  /**
   * コンストラクタ
   * @param elm - ルート要素
   */
  constructor(elm: HTMLElement) {
    this.elm = elm;
  }

  // ========================================
  // Public Methods
  // ========================================

  /**
   * 最後のスクロール位置を取得
   * @returns 最後のスクロール位置
   */
  get lastScrollPosition(): number {
    return this.lastScroll;
  }

  /**
   * 最後のスクロール位置を設定
   * @param scroll - スクロール位置
   */
  set lastScrollPosition(scroll: number) {
    this.lastScroll = scroll;
  }

  /**
   * offsetからthis.lastScrollを更新する
   */
  updateLastScrollFromOffset(): void {
    const currentOffset = storeManager.getData('offset') || DEFAULT_OFFSET;
    this.lastScroll = currentOffset * TR_HEIGHT;
  }

  /**
   * スクロールバーのアクティブ状態を解除する
   */
  deactivateScrollBar(): void {
    const scrollBar = this._getScrollBarElement();
    if (scrollBar) {
      scrollBar.classList.remove('-active');
    }
  }

  /**
   * スクロール処理を行う
   * @param deltaY - Y方向のスクロール量
   */
  handleScroll(deltaY: number): void {
    const calculation = this._calculateScrollPosition(deltaY);

    if (calculation.newScrollPosition === this.lastScroll) {
      return;
    }

    this.lastScroll = calculation.newScrollPosition;
    const offset = this._calculateOffsetFromScroll(this.lastScroll);
    storeManager.setData('offset', offset);
  }

  /**
   * スクロールバーを直接操作している感覚のスクロール処理
   * @param deltaY - Y方向のスクロール量
   * @param touchStartOffset - タッチ開始時のオフセット
   */
  handleScrollWithScrollBarFeedback(
    deltaY: number,
    touchStartOffset: number
  ): void {
    const newOffset = this._calculateTouchScrollOffset(
      deltaY,
      touchStartOffset
    );
    const boundedOffset = this._clampOffsetToValidRange(newOffset);

    this.lastScroll = boundedOffset * TR_HEIGHT;
    this.updateScrollBarDirectly(boundedOffset);
    storeManager.setData('offset', boundedOffset);
  }

  /**
   * スクロールバーの位置を初期化する
   */
  initializeScrollBarPosition(): void {
    const scrollBar = this._getScrollBarElement();
    if (scrollBar) {
      scrollBar.classList.add('-active');
    }
  }

  /**
   * スクロールバーを直接操作している感覚で更新する
   * @param offset - オフセット値
   */
  updateScrollBarDirectly(offset: number): void {
    const scrollBar = this._getScrollBarElement();
    if (!scrollBar) return;

    const calculation = this._calculateScrollBarPosition(offset);
    this._applyScrollBarStyles(scrollBar, calculation, offset);
  }

  // ========================================
  // Private Methods
  // ========================================

  /**
   * スクロール位置を計算する
   */
  private _calculateScrollPosition(deltaY: number): ScrollCalculation {
    const numberOfRecords = storeManager.getData('numberOfRecords');
    const rowCount = storeManager.getData('rowCount');

    const totalHeight = numberOfRecords * TR_HEIGHT;
    let availableScrollY = totalHeight - rowCount * TR_HEIGHT;
    availableScrollY = Math.max(0, availableScrollY);

    const newScrollPosition = this._clampScrollPosition(
      this.lastScroll + deltaY,
      { min: 0, max: availableScrollY }
    );

    return {
      totalHeight,
      availableScrollY,
      newScrollPosition,
    };
  }

  /**
   * スクロール位置を範囲内に制限する
   */
  private _clampScrollPosition(value: number, bounds: ScrollBounds): number {
    return Math.max(bounds.min, Math.min(value, bounds.max));
  }

  /**
   * スクロール位置からオフセットを計算する
   */
  private _calculateOffsetFromScroll(scrollPosition: number): number {
    return Math.ceil(scrollPosition / TR_HEIGHT);
  }

  /**
   * スクロールバー要素を取得する
   */
  private _getScrollBarElement(): HTMLElement | null {
    return this.elm.querySelector('.scroll-bar') as HTMLElement;
  }

  /**
   * タッチスクロールのオフセットを計算する
   */
  private _calculateTouchScrollOffset(
    deltaY: number,
    touchStartOffset: number
  ): number {
    const rowCount = storeManager.getData('rowCount');
    const numberOfRecords = storeManager.getData('numberOfRecords');

    const availableHeight = rowCount * TR_HEIGHT;
    const offsetRate = deltaY / availableHeight;

    return Math.ceil(offsetRate * numberOfRecords) + touchStartOffset;
  }

  /**
   * オフセットを有効な範囲内に制限する
   */
  private _clampOffsetToValidRange(offset: number): number {
    const rowCount = storeManager.getData('rowCount');
    const numberOfRecords = storeManager.getData('numberOfRecords');

    const minOffset = 0;
    const maxOffset = Math.max(0, numberOfRecords - rowCount);

    return Math.max(minOffset, Math.min(offset, maxOffset));
  }

  /**
   * スクロールバーの位置とサイズを計算する
   */
  private _calculateScrollBarPosition(offset: number): ScrollBarCalculation {
    const rowCount = storeManager.getData('rowCount');
    const numberOfRecords = storeManager.getData('numberOfRecords');

    const totalHeight = numberOfRecords * TR_HEIGHT;
    const displayHeight = rowCount * TR_HEIGHT;
    const displayRate = displayHeight / totalHeight;

    let barHeight = Math.ceil(displayHeight * displayRate);
    barHeight = Math.max(barHeight, MIN_SCROLLBAR_HEIGHT);

    const availableHeight = displayHeight - barHeight;
    const availableRate = availableHeight / totalHeight;
    const barTop = Math.ceil(offset * TR_HEIGHT * availableRate);

    return {
      barHeight,
      barTop,
      displayRate,
    };
  }

  /**
   * スクロールバーのスタイルを適用する
   */
  private _applyScrollBarStyles(
    scrollBar: HTMLElement,
    calculation: ScrollBarCalculation,
    offset: number
  ): void {
    const bar = scrollBar.querySelector('.bar') as HTMLElement;
    if (!bar) return;

    // バーのスタイル設定
    bar.style.height = `${calculation.barHeight}px`;
    bar.style.top = `${calculation.barTop}px`;

    // 位置表示の更新
    this._updatePositionDisplay(bar, offset);

    // アクティブ状態を維持
    scrollBar.classList.add('-active');
  }

  /**
   * 位置表示を更新する
   */
  private _updatePositionDisplay(bar: HTMLElement, offset: number): void {
    const position = bar.querySelector('.position') as HTMLElement;
    if (position) {
      position.textContent = String(offset + 1);
    }
  }
}
