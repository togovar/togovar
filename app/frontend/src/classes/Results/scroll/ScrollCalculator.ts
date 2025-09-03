import { TR_HEIGHT } from '../../../global.js';
import {
  ScrollCalculation,
  ScrollBarCalculation,
  ScrollBounds,
} from '../../../types';

const MIN_SCROLLBAR_HEIGHT = 30;

/**
 * スクロール関連の計算ロジックを担当するクラス
 */
export class ScrollCalculator {
  /**
   * スクロール位置を計算
   * @param deltaY - Y軸の変化量
   * @param currentScrollPosition - 現在のスクロール位置
   * @param numberOfRecords - 総レコード数
   * @param rowCount - 表示行数
   */
  calculateScrollPosition(
    deltaY: number,
    currentScrollPosition: number,
    numberOfRecords: number,
    rowCount: number
  ): ScrollCalculation {
    const totalHeight = numberOfRecords * TR_HEIGHT;
    let availableScrollY = totalHeight - rowCount * TR_HEIGHT;
    availableScrollY = Math.max(0, availableScrollY);

    const newScrollPosition = this.clampScrollPosition(
      currentScrollPosition + deltaY,
      { min: 0, max: availableScrollY }
    );

    return {
      totalHeight,
      availableScrollY,
      newScrollPosition,
    };
  }

  /**
   * スクロール位置を境界内に制限
   * @param value - 制限する値
   * @param bounds - 境界値
   */
  clampScrollPosition(value: number, bounds: ScrollBounds): number {
    return Math.max(bounds.min, Math.min(value, bounds.max));
  }

  /**
   * スクロール位置からオフセットを計算
   * @param scrollPosition - スクロール位置
   */
  calculateOffsetFromScroll(scrollPosition: number): number {
    return Math.ceil(scrollPosition / TR_HEIGHT);
  }

  /**
   * タッチスクロールのオフセットを計算
   * @param deltaY - Y軸の変化量
   * @param touchStartOffset - タッチ開始時のオフセット
   * @param rowCount - 表示行数
   * @param numberOfRecords - 総レコード数
   */
  calculateTouchScrollOffset(
    deltaY: number,
    touchStartOffset: number,
    rowCount: number,
    numberOfRecords: number
  ): number {
    const availableHeight = rowCount * TR_HEIGHT;
    const offsetRate = deltaY / availableHeight;

    return Math.ceil(offsetRate * numberOfRecords) + touchStartOffset;
  }

  /**
   * オフセットを有効範囲内に制限
   * @param offset - オフセット値
   * @param rowCount - 表示行数
   * @param numberOfRecords - 総レコード数
   */
  clampOffsetToValidRange(
    offset: number,
    rowCount: number,
    numberOfRecords: number
  ): number {
    const minOffset = 0;
    const maxOffset = Math.max(0, numberOfRecords - rowCount);

    return Math.max(minOffset, Math.min(offset, maxOffset));
  }

  /**
   * スクロールバーの位置とサイズを計算
   * @param offset - オフセット値
   * @param rowCount - 表示行数
   * @param numberOfRecords - 総レコード数
   */
  calculateScrollBarPosition(
    offset: number,
    rowCount: number,
    numberOfRecords: number
  ): ScrollBarCalculation {
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
}
