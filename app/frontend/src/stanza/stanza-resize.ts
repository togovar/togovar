import { STANZA_RESIZE_CONFIG } from './stanza-resize-config';

/**
 * Extended HTMLElement interface that includes shadowRoot property
 */
interface HTMLElementWithShadowRoot extends HTMLElement {
  shadowRoot: ShadowRoot | null;
}

/**
 * Delay in milliseconds before starting to observe Stanza elements
 * Allows time for Stanza components to fully initialize
 */
const STANZA_INITIALIZATION_DELAY_MS = 500;

/**
 * Initialize resize behavior for all Stanza elements defined in config
 * Sets up observers for each container to handle dynamic height adjustments
 */
export function initializeStanzaResize(): void {
  Object.entries(STANZA_RESIZE_CONFIG).forEach(([stanzaId, config]) => {
    const container = document.getElementById(stanzaId);
    if (!container) return;

    initializeStanza(container, config);
  });
}

/**
 * Initialize resize behavior for a single Stanza container
 * Handles automatic height adjustments based on content changes and manual resizing
 *
 * @param container - The DOM element containing the Stanza component
 * @param config - Configuration object with minHeight and maxInitialHeight values
 */
function initializeStanza(
  container: HTMLElement,
  config: { minHeight: number; maxInitialHeight: number }
): void {
  let isManuallyResized = false; // Flag to track if user has manually resized the container
  let previousContentHeight = 0; // Previous height of the shadow content for comparison
  let lastSetHeight = 0; // Last height value set by JavaScript (to distinguish from manual resize)
  let isSettingHeight = false; // Flag to prevent detecting our own height changes as manual resize

  // Collection of observers used for monitoring changes
  const observers = {
    mutation: null as MutationObserver | null,
    shadowContentResize: null as ResizeObserver | null,
  };

  /**
   * Find the Stanza custom element within the container
   *
   * @returns The Stanza element or undefined if not found
   */
  const findStanzaElement = (): HTMLElementWithShadowRoot | undefined => {
    const children = Array.from(container.children);
    return children.find((child) =>
      child.tagName.toLowerCase().startsWith('togostanza-')
    ) as HTMLElementWithShadowRoot | undefined;
  };

  /**
   * Get the main content element from the Stanza's Shadow DOM
   * First tries to find a <main> element, falls back to first child
   *
   * @returns The shadow content element or null if not available
   */
  const getShadowContent = (): HTMLElement | null => {
    const stanzaElement = findStanzaElement();
    if (!stanzaElement?.shadowRoot) return null;

    return (
      (stanzaElement.shadowRoot.querySelector('main') as HTMLElement) ||
      (stanzaElement.shadowRoot.children[0] as HTMLElement) ||
      null
    );
  };

  /**
   * Set the container height programmatically
   * Uses a flag to prevent our own height changes from being detected as manual resize
   *
   * @param height - Height value in pixels to set
   */
  const setHeight = (height: number): void => {
    isSettingHeight = true;
    container.style.height = `${height}px`;
    lastSetHeight = height;

    // Clear the flag after the next frame to allow manual resize detection again
    requestAnimationFrame(() => {
      isSettingHeight = false;
    });
  };

  /**
   * Mark the container as manually resized by the user
   * Disables max-height constraint
   * After this, automatic height adjustments are limited
   */
  const markAsManuallyResized = (): void => {
    isManuallyResized = true;
    container.style.maxHeight = 'none';
  };

  /**
   * Handle changes in shadow content size
   * Implements the core logic for automatic height adjustment and manual resize detection
   */
  const handleContentResize = (): void => {
    // Initialization: Store initial content height (only when previousContentHeight is 0)
    if (previousContentHeight === 0) {
      const shadowContent = getShadowContent();
      if (shadowContent) {
        previousContentHeight = shadowContent.scrollHeight;
      }
      return;
    }

    const shadowContent = getShadowContent();
    if (!shadowContent) return;

    const currentContentHeight = shadowContent.scrollHeight;
    const currentContainerHeight = container.offsetHeight;

    // After manual resize: Limited automatic adjustment
    if (isManuallyResized) {
      // If container is already at or above maxInitialHeight, just track content changes
      if (currentContainerHeight >= config.maxInitialHeight) {
        previousContentHeight = currentContentHeight;
        return;
      }

      // If content changes while under maxInitialHeight, snap to maxInitialHeight
      // This handles accordion open/close after manual resize
      if (currentContentHeight !== previousContentHeight) {
        setHeight(config.maxInitialHeight);
        previousContentHeight = currentContentHeight;
      }
      return;
    }

    // Manual resize detection: Check if container exceeds maxInitialHeight
    if (currentContainerHeight > config.maxInitialHeight) {
      // If height wasn't set by JavaScript but style.height exists, user resized it
      if (lastSetHeight === 0 && container.style.height) {
        previousContentHeight = currentContentHeight;
        markAsManuallyResized();
        return;
      }
    }

    // Content expanded (e.g., accordion opened)
    if (
      currentContentHeight > previousContentHeight &&
      currentContentHeight > 0
    ) {
      setHeight(config.maxInitialHeight);
      previousContentHeight = currentContentHeight;
    }
    // Content collapsed (e.g., accordion closed) - only after it was opened at least once
    else if (
      lastSetHeight > 0 &&
      currentContentHeight < previousContentHeight
    ) {
      setHeight(config.maxInitialHeight);
      previousContentHeight = currentContentHeight;
    }
    // Content height unchanged but valid
    else if (currentContentHeight > 0) {
      previousContentHeight = currentContentHeight;
    }
  };

  /**
   * Start observing the shadow content for size changes
   * Resets tracking variables and sets up ResizeObserver
   */
  const startObservingShadowContent = (): void => {
    const shadowContent = getShadowContent();
    if (!shadowContent) return;

    // Disconnect any existing observer
    observers.shadowContentResize?.disconnect();

    // Reset to trigger initialization
    previousContentHeight = 0;
    handleContentResize();

    // Create new ResizeObserver for shadow content
    observers.shadowContentResize = new ResizeObserver(handleContentResize);

    // Start observing in the next frame to ensure element is ready
    requestAnimationFrame(() => {
      const currentShadowContent = getShadowContent();
      if (currentShadowContent && observers.shadowContentResize) {
        observers.shadowContentResize.observe(currentShadowContent);
      }
    });
  };

  // Monitor the container for addition of Stanza elements
  // Starts shadow content observation once Stanza element is added
  observers.mutation = new MutationObserver(() => {
    const shadowContent = getShadowContent();
    if (shadowContent && !observers.shadowContentResize) {
      startObservingShadowContent();
    }
  });

  observers.mutation.observe(container, {
    childList: true, // Watch for added/removed children
    subtree: true, // Watch entire subtree for changes
  });

  // Delayed initialization to allow Stanza components to fully load
  setTimeout(startObservingShadowContent, STANZA_INITIALIZATION_DELAY_MS);

  /**
   * Observer for detecting manual resize of the container by the user
   * Distinguishes between programmatic height changes and user-initiated resize
   */
  const containerResizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      // Ignore height changes we're currently making
      if (isSettingHeight) return;

      const currentHeight = Math.round(entry.contentRect.height);

      // Detect manual resize: Height changed but not by our setHeight function
      // Only detect after JavaScript has set height at least once (lastSetHeight > 0)
      if (
        !isManuallyResized &&
        lastSetHeight > 0 &&
        currentHeight !== lastSetHeight
      ) {
        markAsManuallyResized();

        // If manually resized smaller than maxInitialHeight, snap to maxInitialHeight
        if (currentHeight < config.maxInitialHeight) {
          setHeight(config.maxInitialHeight);
        } else {
          // Otherwise, accept the new height
          lastSetHeight = currentHeight;
        }

        // Stop observing DOM mutations after manual resize is detected
        observers.mutation?.disconnect();
      }
    }
  });

  // Start observing the container for size changes
  containerResizeObserver.observe(container);
}
