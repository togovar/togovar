import type { RangeSliderState, RangeStateKey } from './RangeSliderTypes';

/** 数値属性が空や不正値でも既存状態を壊さないため、fallback付きで変換する。 */
export function parseNumber(value: string | number, fallback: number): number {
  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) ? fallback : parsedValue;
}

/** range input のvalue属性は小数3桁で揃える既存表示を保つ。 */
export function formatSliderValue(value: string): string {
  return parseNumber(value, 0).toFixed(3);
}

/** booleanと文字列の両方で渡されるinvert値をbooleanに正規化する。 */
export function toInvertValue(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  return value === '1' || value === 'true';
}

/** 2本のつまみが交差しないよう、下限・上限のどちらへ反映するかを現在値から決める。 */
export function setRangeValue(
  target: RangeSliderState,
  prop: RangeStateKey,
  value: unknown
): void {
  const parsedValue =
    typeof value === 'number' || typeof value === 'string'
      ? parseFloat(String(value))
      : Number.NaN;
  if (Number.isNaN(parsedValue)) return;

  const clampedValue = Math.min(Math.max(parsedValue, target.min), target.max);

  if (prop === 'from') {
    if (clampedValue > target.to) {
      target.to = clampedValue;
    } else {
      target.from = clampedValue;
    }
    return;
  }

  if (clampedValue < target.from) {
    target.from = clampedValue;
  } else {
    target.to = clampedValue;
  }
}

/** 0や1でも小数表示を保ち、頻度入力欄の表示桁が操作ごとに揺れないようにする。 */
export function formatInputValue(value: number | string): string {
  const num = parseFloat(String(value));
  if (Number.isNaN(num)) return String(value);

  const str = num.toString();
  const decimalIndex = str.indexOf('.');
  const currentDecimals =
    decimalIndex === -1 ? 0 : str.length - decimalIndex - 1;
  const decimals = Math.max(1, currentDecimals);

  return num.toFixed(decimals);
}
