import { STANZA_RESIZE_CONFIG } from './stanza-resize-config';

interface HTMLElementWithShadowRoot extends HTMLElement {
  shadowRoot: ShadowRoot | null;
}

export function initializeStanzaResize(): void {
  Object.entries(STANZA_RESIZE_CONFIG).forEach(([stanzaId, config]) => {
    const container = document.getElementById(stanzaId);
    if (!container) return;

    let initialHeightSet = false;

    const setInitialHeight = () => {
      if (initialHeightSet) return;

      const children = Array.from(container.children);
      const stanzaElement = children.find((child) =>
        child.tagName.toLowerCase().startsWith('togostanza-')
      ) as HTMLElementWithShadowRoot | undefined;

      if (!stanzaElement) return;

      const shadowRoot = stanzaElement.shadowRoot;
      if (!shadowRoot) return;

      const shadowContent =
        shadowRoot.querySelector('main') || shadowRoot.children[0];
      if (!shadowContent) return;

      const contentHeight = shadowContent.scrollHeight;

      if (contentHeight > 0) {
        const initialHeight = Math.min(contentHeight, config.maxInitialHeight);
        container.style.minHeight = `${config.minHeight}px`;
        container.style.maxHeight = `${config.maxInitialHeight}px`;
        container.style.height = `${initialHeight}px`;
        initialHeightSet = true;

        console.log(`Set initial height for ${stanzaId}: ${initialHeight}px`);
      }
    };

    // MutationObserverでStanza要素とShadow DOMの追加を監視
    const mutationObserver = new MutationObserver(() => {
      setInitialHeight();
    });

    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
    });

    // ResizeObserverでStanza要素のサイズ変化を監視
    const stanzaResizeObserver = new ResizeObserver(() => {
      if (initialHeightSet) {
        stanzaResizeObserver.disconnect();
        return;
      }
      setInitialHeight();
    });

    // Stanza要素を監視対象に追加（遅延して確認）
    const startObservingStanza = () => {
      const children = Array.from(container.children);
      const stanzaElement = children.find((child) =>
        child.tagName.toLowerCase().startsWith('togostanza-')
      ) as HTMLElement | undefined;

      if (stanzaElement) {
        stanzaResizeObserver.observe(stanzaElement);
      }
    };

    // 初回チェック
    setTimeout(() => {
      setInitialHeight();
      startObservingStanza();

      if (initialHeightSet) {
        mutationObserver.disconnect();
        stanzaResizeObserver.disconnect();
      }
    }, 500);

    // ユーザーのリサイズ操作を監視
    const containerResizeObserver = new ResizeObserver(() => {
      if (!initialHeightSet) return;

      if (!container.classList.contains('resized')) {
        container.classList.add('resized');
        container.style.maxHeight = 'none';
      }
    });

    containerResizeObserver.observe(container);
  });
}
