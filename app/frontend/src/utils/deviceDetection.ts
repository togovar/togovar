/**
 * Device detection utilities
 * Provides consistent device capability detection across the application
 */

/**
 * Detects if the device supports mouse interaction (hover and fine pointer)
 *
 * Uses CSS Media Queries to detect:
 * - hover capability (can hover over elements)
 * - fine pointer precision (mouse/trackpad vs finger touch)
 *
 * @returns true for desktop/laptop with mouse/trackpad, false for touch-only devices
 *
 * @example
 * ```typescript
 * if (supportsMouseInteraction()) {
 *   // Enable hover effects, precise drag operations
 * } else {
 *   // Enable touch-optimized UI
 * }
 * ```
 */
export function supportsMouseInteraction(): boolean {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/**
 * Detects if the device should use touch-optimized UI
 *
 * This is the inverse of supportsMouseInteraction() - devices that lack
 * hover capability or fine pointer precision should use touch-optimized interfaces.
 *
 * @returns true for touch devices (tablets, smartphones), false for mouse/trackpad devices
 *
 * @example
 * ```typescript
 * if (isTouchDevice()) {
 *   // Use larger touch targets, disable hover states
 * } else {
 *   // Use precise mouse interactions
 * }
 * ```
 */
export function isTouchDevice(): boolean {
  return !supportsMouseInteraction();
}

/**
 * Detects if touch events are supported by the browser/device
 *
 * This checks for the presence of touch APIs, but doesn't indicate
 * whether touch is the primary input method. Use isTouchDevice() for UI decisions.
 *
 * @returns true if touch events are available
 */
export function hasTouchSupport(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Device capability detection result
 */
export interface DeviceCapabilities {
  /** Whether the device supports mouse interaction (hover + fine pointer) */
  supportsMouseInteraction: boolean;
  /** Whether the device should use touch-optimized UI */
  isTouchDevice: boolean;
  /** Whether touch events are supported */
  hasTouchSupport: boolean;
}

/**
 * Gets comprehensive device capability information
 *
 * @returns Object containing all device capability flags
 *
 * @example
 * ```typescript
 * const capabilities = getDeviceCapabilities();
 * console.log(capabilities);
 * // { supportsMouseInteraction: false, isTouchDevice: true, hasTouchSupport: true }
 * ```
 */
export function getDeviceCapabilities(): DeviceCapabilities {
  return {
    supportsMouseInteraction: supportsMouseInteraction(),
    isTouchDevice: isTouchDevice(),
    hasTouchSupport: hasTouchSupport(),
  };
}
