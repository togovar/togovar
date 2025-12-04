import { STANZA_RESIZE_CONFIG } from './stanza-resize-config';

interface HTMLElementWithShadowRoot extends HTMLElement {
  shadowRoot: ShadowRoot | null;
}

const STANZA_INITIALIZATION_DELAY_MS = 500;

export function initializeStanzaResize(): void {
  Object.entries(STANZA_RESIZE_CONFIG).forEach(([stanzaId, config]) => {
    const container = document.getElementById(stanzaId);
    if (!container) return;

    initializeStanza(container, stanzaId, config);
  });
}

function initializeStanza(
  container: HTMLElement,
  stanzaId: string,
  config: { minHeight: number; maxInitialHeight: number }
): void {
  let isManuallyResized = false;

  // オブザーバーへの参照を保持するオブジェクト
  const observers = {
    mutation: null as MutationObserver | null,
    stanzaResize: null as ResizeObserver | null,
  };

  const findStanzaElement = (): HTMLElementWithShadowRoot | undefined => {
    const children = Array.from(container.children);
    return children.find((child) =>
      child.tagName.toLowerCase().startsWith('togostanza-')
    ) as HTMLElementWithShadowRoot | undefined;
  };

  const adjustHeight = (): void => {
    if (isManuallyResized) return;

    const stanzaElement = findStanzaElement();

    if (!stanzaElement) return;

    const shadowRoot = stanzaElement.shadowRoot;
    if (!shadowRoot) return;

    const shadowContent =
      shadowRoot.querySelector('main') || shadowRoot.children[0];
    if (!shadowContent) return;

    const contentHeight = shadowContent.scrollHeight;

    if (contentHeight > 0) {
      const newHeight = Math.min(contentHeight, config.maxInitialHeight);
      container.style.minHeight = `${config.minHeight}px`;
      container.style.maxHeight = `${config.maxInitialHeight}px`;
      container.style.height = `${newHeight}px`;
      isManuallyResized = true;

      // オブザーバーを停止
      observers.mutation?.disconnect();
      observers.stanzaResize?.disconnect();
    }
  };

  // MutationObserverを作成
  observers.mutation = new MutationObserver(() => {
    adjustHeight();
  });

  observers.mutation.observe(container, {
    childList: true,
    subtree: true,
  });

  // ResizeObserverを作成
  observers.stanzaResize = new ResizeObserver(() => {
    if (isManuallyResized) {
      observers.stanzaResize?.disconnect();
      return;
    }
    adjustHeight();
  });

  const startObservingStanza = (): void => {
    const stanzaElement = findStanzaElement();

    if (stanzaElement && observers.stanzaResize) {
      observers.stanzaResize.observe(stanzaElement);
    }
  };

  setTimeout(() => {
    adjustHeight();
    startObservingStanza();
  }, STANZA_INITIALIZATION_DELAY_MS);

  const containerResizeObserver = new ResizeObserver(() => {
    if (!isManuallyResized) return;

    if (!container.classList.contains('resized')) {
      container.classList.add('resized');
      container.style.maxHeight = 'none';
      containerResizeObserver.disconnect();
    }
  });

  containerResizeObserver.observe(container);
}
