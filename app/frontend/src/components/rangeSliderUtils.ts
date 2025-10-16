/**
 * Range Slider Utility Functions
 *
 * Helper functions for managing range slider visual updates:
 * - Ruler rendering (scale marks)
 * - Gradient track filling
 * - Thumb border styling
 */

export interface RulerRenderOptions {
  rulerElement: Element;
  rulerNumberOfSteps: number;
  min: number;
  max: number;
  orientation: 'horizontal' | 'vertical';
}

/**
 * Re-render ruler scale marks
 *
 * Creates scale divs evenly distributed across the slider width.
 * Each scale shows a numeric label (e.g., 0.0, 0.1, 0.2, ..., 1.0).
 * Called when ruler-number-of-steps or orientation changes.
 */
export function renderRuler(options: RulerRenderOptions): void {
  const { rulerElement, rulerNumberOfSteps, min, max, orientation } = options;

  rulerElement.innerHTML = ''; // Clear existing scales

  const step = (max - min) / rulerNumberOfSteps;

  // Create and position scale marks
  for (let i = 0; i <= rulerNumberOfSteps; i++) {
    const scale = document.createElement('div');
    scale.className = 'scale';
    scale.part.add('scale'); // CSS part for styling
    scale.part.add(`scale-${orientation}`); // Orientation-specific styling
    scale.innerText = (min + i * step).toFixed(1); // Numeric label
    scale.style.left = `calc(${(i * 100) / rulerNumberOfSteps}% - 0.5em`; // Position
    rulerElement.appendChild(scale);
  }
}

export interface FillSliderOptions {
  slider1: HTMLInputElement;
  slider2: HTMLInputElement;
  sliderTrack: HTMLElement;
  min: number;
  max: number;
  invert: '0' | '1';
}

/**
 * Update slider track gradient to show selected/unselected regions
 *
 * Visual representation:
 * - Normal mode: Light gray | BLUE selected range | Light gray
 * - Inverted mode: BLUE | Light gray unselected range | BLUE
 *
 * The gradient uses CSS variables:
 * - var(--color-light-gray): Unselected regions
 * - var(--color-key-dark1): Selected regions
 */
export function fillSlider(options: FillSliderOptions): void {
  const { slider1, slider2, sliderTrack, min, max, invert } = options;

  // Get actual slider values (handle crossing)
  const val1 = Math.min(parseFloat(slider1.value), parseFloat(slider2.value));
  const val2 = Math.max(parseFloat(slider1.value), parseFloat(slider2.value));

  // Convert values to percentages (0-100%)
  const percentVal1 = (val1 * 100) / (max - min);
  const percentVal2 = (val2 * 100) / (max - min);

  // Apply gradient based on invert state
  if (invert !== '1') {
    // Normal mode: Gray - Blue - Gray
    sliderTrack.style.background = `linear-gradient(90deg, var(--color-light-gray) 0%, var(--color-light-gray) ${percentVal1}% , var(--color-key-dark1) ${percentVal1}%,   var(--color-key-dark1) ${percentVal2}%, var(--color-light-gray) ${percentVal2}%,  var(--color-light-gray) 100% )`;
  } else {
    // Inverted mode: Blue - Gray - Blue
    sliderTrack.style.background = `linear-gradient(90deg, var(--color-key-dark1) 0%, var(--color-key-dark1) ${percentVal1}%, var(--color-light-gray) ${percentVal1}%,  var(--color-light-gray) ${percentVal2}%, var(--color-key-dark1) ${percentVal2}%,  var(--color-key-dark1) 100% )`;
  }
}

export interface DrawThumbsOptions {
  slider1: HTMLInputElement;
  slider2: HTMLInputElement;
  styleElement: HTMLStyleElement;
}

/**
 * Update slider thumb borders dynamically based on slider positions
 *
 * Visual feedback:
 * - Left thumb: Border on right side
 * - Right thumb: Border on left side
 *
 * Uses dynamic CSS injection to target specific slider thumbs.
 */
export function drawThumbs(options: DrawThumbsOptions): void {
  const { slider1, slider2, styleElement } = options;

  // Determine which slider is on the left/right
  if (parseFloat(slider1.value) < parseFloat(slider2.value)) {
    // slider1 is left, slider2 is right
    styleElement.innerHTML = `#slider-1::-webkit-slider-thumb {
            border-right: 1px solid rgba(0, 0, 0, 0.5);
            transform: translateX(-1.5px);
        }
        #slider-2::-webkit-slider-thumb {
            border-left: 1px solid rgba(0, 0, 0, 0.5);
            transform: translateX(1.5px)
        }
        `;
  } else {
    // slider2 is left, slider1 is right
    styleElement.innerHTML = `#slider-2::-webkit-slider-thumb {
            border-right: 1px solid rgba(0, 0, 0, 0.5);
            transform: translateX(-1.5px);
        }
        #slider-1::-webkit-slider-thumb {
            border-left: 1px solid rgba(0, 0, 0, 0.5);
            transform: translateX(1.5px)
        }
        `;
  }
}
