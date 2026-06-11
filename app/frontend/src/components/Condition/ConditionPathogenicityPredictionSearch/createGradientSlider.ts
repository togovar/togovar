import type { Threshold } from './PredictionDatasets';

type GradientStopPx = { color: string; offsetPx: number };

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

function getLeftRatio(barEl: HTMLElement): number {
  const leftValue = (barEl.style.left || '0%').trim();
  const n = Number.parseFloat(leftValue);
  return Number.isFinite(n) ? clamp(n / 100, 0, 1) : 0;
}

export function createGradientSlider(
  activeDataset: Threshold,
  rangeEl: HTMLElement,
  sliderWidth?: number
): string {
  const width =
    sliderWidth && sliderWidth > 0 ? sliderWidth : rangeEl.clientWidth || 100;

  const leftRatio = getLeftRatio(rangeEl);

  const stops: GradientStopPx[] = Object.values(activeDataset)
    .flatMap(({ color, min, max }) => [
      { color, offsetPx: clamp((min - leftRatio) * width, 0, width) },
      { color, offsetPx: clamp((max - leftRatio) * width, 0, width) },
    ])
    .sort((a, b) => a.offsetPx - b.offsetPx);

  if (!stops.length) return 'none';

  const gradientCss = stops.map((s) => `${s.color} ${s.offsetPx}px`).join(', ');
  return `linear-gradient(to right, ${gradientCss})`;
}
