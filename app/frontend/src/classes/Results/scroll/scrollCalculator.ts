import { TR_HEIGHT } from '../../../global';
import type {
  ScrollCalculation,
  ScrollBarCalculation,
  ScrollBounds,
} from '../../../types';

const MIN_SCROLLBAR_HEIGHT = 30;

/**
 * Collection of pure calculation functions for scroll-related operations.
 * These functions handle scroll position calculations, offset conversions,
 * and scrollbar visual positioning without any side effects.
 */

/**
 * Calculates new scroll position based on wheel/trackpad input.
 * Handles boundary checking to prevent scrolling beyond valid range.
 *
 * @param deltaY - The Y-axis movement delta from scroll events
 * @param currentScrollPosition - Current pixel scroll position
 * @param totalRecordCount - Total number of records in the dataset
 * @param visibleRowCount - Number of rows visible in the viewport
 * @returns Object containing calculated scroll values and constraints
 */
export function calculateNewScrollPosition(
  deltaY: number,
  currentScrollPosition: number,
  totalRecordCount: number,
  visibleRowCount: number
): ScrollCalculation {
  const totalContentHeight = totalRecordCount * TR_HEIGHT;
  let maxScrollableDistance = totalContentHeight - visibleRowCount * TR_HEIGHT;
  maxScrollableDistance = Math.max(0, maxScrollableDistance);

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
 * Constrains a numeric value within specified minimum and maximum bounds.
 * Essential for preventing scroll positions from exceeding valid ranges.
 *
 * @param value - The value to constrain
 * @param bounds - Object containing min and max boundary values
 * @returns The value clamped within the specified bounds
 */
export function clampValueWithinBounds(
  value: number,
  bounds: ScrollBounds
): number {
  return Math.max(bounds.min, Math.min(value, bounds.max));
}

/**
 * Converts pixel-based scroll position to row-based offset.
 * Used to determine which row should be at the top of the viewport.
 *
 * @param scrollPosition - Current scroll position in pixels
 * @returns Row offset (0-based index of the first visible row)
 */
export function convertScrollPositionToRowOffset(
  scrollPosition: number
): number {
  return Math.ceil(scrollPosition / TR_HEIGHT);
}

/**
 * Calculates row offset for touch-based scrolling interactions.
 * Touch scrolling uses proportional movement relative to available space.
 *
 * @param deltaY - Y-axis movement delta from touch events
 * @param touchStartOffset - Row offset when touch interaction began
 * @param visibleRowCount - Number of rows visible in the viewport
 * @param totalRecordCount - Total number of records in the dataset
 * @returns Calculated row offset for the new scroll position
 */
export function calculateTouchBasedRowOffset(
  deltaY: number,
  touchStartOffset: number,
  visibleRowCount: number,
  totalRecordCount: number
): number {
  const viewportHeight = visibleRowCount * TR_HEIGHT;
  const movementRatio = deltaY / viewportHeight;

  return Math.ceil(movementRatio * totalRecordCount) + touchStartOffset;
}

/**
 * Ensures row offset stays within valid boundaries.
 * Prevents scrolling beyond the first or last available rows.
 *
 * @param offset - Row offset to validate and constrain
 * @param visibleRowCount - Number of rows visible in the viewport
 * @param totalRecordCount - Total number of records in the dataset
 * @returns Constrained offset within valid range [0, maxOffset]
 */
export function constrainRowOffsetToValidRange(
  offset: number,
  visibleRowCount: number,
  totalRecordCount: number
): number {
  const minOffset = 0;
  const maxOffset = Math.max(0, totalRecordCount - visibleRowCount);

  return Math.max(minOffset, Math.min(offset, maxOffset));
}

/**
 * Calculates scrollbar visual properties based on current scroll state.
 * Determines the scrollbar's height, position, and display ratio for proper rendering.
 * Ensures minimum scrollbar height for usability regardless of content size.
 *
 * @param currentRowOffset - Current row offset (first visible row index)
 * @param visibleRowCount - Number of rows visible in the viewport
 * @param totalRecordCount - Total number of records in the dataset
 * @returns Object containing scrollbar height, position, and display ratio
 */
export function calculateScrollbarDimensions(
  currentRowOffset: number,
  visibleRowCount: number,
  totalRecordCount: number
): ScrollBarCalculation {
  const totalContentHeight = totalRecordCount * TR_HEIGHT;
  const viewportHeight = visibleRowCount * TR_HEIGHT;
  const visibilityRatio = viewportHeight / totalContentHeight;

  // Calculate scrollbar height with minimum constraint
  let scrollbarHeight = Math.ceil(viewportHeight * visibilityRatio);
  scrollbarHeight = Math.max(scrollbarHeight, MIN_SCROLLBAR_HEIGHT);

  // Calculate scrollbar position within available space
  const availableScrollSpace = viewportHeight - scrollbarHeight;
  const positionRatio = availableScrollSpace / totalContentHeight;
  const scrollbarTopPosition = Math.ceil(
    currentRowOffset * TR_HEIGHT * positionRatio
  );

  return {
    barHeight: scrollbarHeight,
    barTop: scrollbarTopPosition,
    displayRate: visibilityRatio,
  };
}
