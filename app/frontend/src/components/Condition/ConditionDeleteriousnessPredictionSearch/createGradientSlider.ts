import type { Threshold } from './PredictionDatasets';

type GradientStopPx = { color: string; offsetPx: number };

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

function getLeftRatio(barEl: HTMLElement): number {
  const leftValue = (barEl.style.left || '0%').trim();
  const n = Number.parseFloat(leftValue);
  return Number.isFinite(n) ? clamp(n / 100, 0, 1) : 0;
}

/**
 * スコア範囲が 0-1 以外（CADD など）でもグラデーションを正しく配置するため、
 * threshold の min/max を 0-1 に正規化してからピクセルオフセットを計算する。
 */
export function createGradientSlider(
  activeDataset: Threshold,
  rangeEl: HTMLElement,
  sliderWidth?: number,
  scoreMin = 0,
  scoreMax = 1
): string {
  const width =
    sliderWidth && sliderWidth > 0 ? sliderWidth : rangeEl.clientWidth || 100;

  const leftRatio = getLeftRatio(rangeEl);

  const scoreRange = scoreMax - scoreMin;
  const normalize = (v: number) =>
    scoreRange > 0 ? (v - scoreMin) / scoreRange : 0;

  const stops: GradientStopPx[] = Object.values(activeDataset)
    .flatMap(({ color, min, max }) => [
      {
        color,
        offsetPx: clamp((normalize(min) - leftRatio) * width, 0, width),
      },
      {
        color,
        offsetPx: clamp((normalize(max) - leftRatio) * width, 0, width),
      },
    ])
    .sort((a, b) => a.offsetPx - b.offsetPx);

  if (!stops.length) return 'none';

  const gradientCss = stops.map((s) => `${s.color} ${s.offsetPx}px`).join(', ');
  return `linear-gradient(to right, ${gradientCss})`;
}
