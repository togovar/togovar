import { TR_HEIGHT } from '../../../global';
import type {
  ScrollCalculation,
  ScrollBarCalculation,
  ScrollBounds,
} from '../../../types';

const MIN_SCROLLBAR_HEIGHT = 30;

/**
 * スクロール関連の純粋計算関数群。
 * 副作用なしで座標計算・offset変換・スクロールバーの表示位置を算出する。
 */

/**
 * ホイール・トラックパッド入力からの新しいスクロール位置を計算する。
 * 有効範囲外へのスクロールを防ぐ境界チェックを含む。
 */
export function calculateNewScrollPosition(
  deltaY: number,
  currentScrollPosition: number,
  totalRecordCount: number,
  visibleRowCount: number
): ScrollCalculation {
  const totalContentHeight = totalRecordCount * TR_HEIGHT;
  const maxScrollableDistance = Math.max(
    0,
    totalContentHeight - visibleRowCount * TR_HEIGHT
  );

  const newScrollPosition = clampValueWithinBounds(
    currentScrollPosition + deltaY,
    { min: 0, max: maxScrollableDistance }
  );

  return {
    totalHeight: totalContentHeight,
    availableScrollY: maxScrollableDistance,
    newScrollPosition,
  };
}

/**
 * 数値を指定した最小値・最大値の範囲内に収める。
 */
export function clampValueWithinBounds(
  value: number,
  bounds: ScrollBounds
): number {
  return Math.max(bounds.min, Math.min(value, bounds.max));
}

/**
 * ピクセル単位のスクロール位置を行単位の offset に変換する。
 * ビューポート先頭に表示すべき行のインデックスを返す。
 */
export function convertScrollPositionToRowOffset(
  scrollPosition: number
): number {
  return Math.ceil(scrollPosition / TR_HEIGHT);
}

/**
 * タッチスクロールの行 offset を計算する。
 * 27px（TR_HEIGHT）のスワイプ = 1行という1:1の自然なスクロール感を実現する。
 * deltaY はタッチ開始からの累積ピクセル量、touchStartOffset はタッチ開始時に
 * 一度だけ取得した固定値を渡すこと（ジェスチャー中に変えると誤差が積み上がる）。
 */
export function calculateTouchBasedRowOffset(
  deltaY: number,
  touchStartOffset: number
): number {
  return Math.round(deltaY / TR_HEIGHT) + touchStartOffset;
}

/**
 * 行 offset を有効範囲 [0, totalRecordCount - visibleRowCount] に収める。
 * 先頭・末尾を超えたスクロールを防ぐ。
 */
export function constrainRowOffsetToValidRange(
  offset: number,
  visibleRowCount: number,
  totalRecordCount: number
): number {
  const maxOffset = Math.max(0, totalRecordCount - visibleRowCount);
  return Math.max(0, Math.min(offset, maxOffset));
}

/**
 * 現在のスクロール状態からスクロールバーの表示プロパティを計算する。
 * containerHeight には実際の DOM 高さ（container.offsetHeight）を渡すこと。
 * visibleRowCount * TR_HEIGHT ではなく実 DOM 高さを使うことで、
 * ドラッグ時の constrainPositionWithinBounds（container.offsetHeight 基準）と一致する。
 * コンテンツ量に関わらず最低高さ（MIN_SCROLLBAR_HEIGHT）を保証する。
 */
export function calculateScrollbarDimensions(
  currentRowOffset: number,
  visibleRowCount: number,
  totalRecordCount: number,
  containerHeight: number
): ScrollBarCalculation {
  const visibilityRatio =
    totalRecordCount === 0 ? 1 : visibleRowCount / totalRecordCount;

  const scrollbarHeight = Math.max(
    Math.ceil(containerHeight * visibilityRatio),
    MIN_SCROLLBAR_HEIGHT
  );

  const availableScrollSpace = containerHeight - scrollbarHeight;
  // offset/maxOffset の比率でマッピングすることで、maxOffset 到達時に
  // barTop = availableScrollSpace（物理的に底に接する）を保証する
  const maxOffset = Math.max(0, totalRecordCount - visibleRowCount);
  const scrollbarTopPosition =
    maxOffset === 0
      ? 0
      : Math.round((currentRowOffset / maxOffset) * availableScrollSpace);

  return {
    barHeight: scrollbarHeight,
    barTop: scrollbarTopPosition,
    displayRate: visibilityRatio,
  };
}
