import { STANZA_RESIZE_CONFIG } from './stanza-resize-config';

// HTMLElementWithShadowRoot型を定義
interface HTMLElementWithShadowRoot extends HTMLElement {
  shadowRoot: ShadowRoot | null;
}

export function initializeStanzaResize(): void {
  Object.entries(STANZA_RESIZE_CONFIG).forEach(([stanzaId, config]) => {
    const container = document.getElementById(stanzaId);
    if (!container) return;

    let initialHeightSet = false;

    const initResize = (retryCount = 0) => {
      const children = Array.from(container.children);
      const stanzaElement = children.find((child) =>
        child.tagName.toLowerCase().startsWith('togostanza-')
      ) as HTMLElementWithShadowRoot | undefined;

      if (!stanzaElement) {
        if (retryCount < 50) {
          setTimeout(() => initResize(retryCount + 1), 100);
        }
        return;
      }

      // Shadow DOM内のコンテンツ要素を取得
      const shadowRoot = stanzaElement.shadowRoot;
      if (!shadowRoot) {
        if (retryCount < 50) {
          setTimeout(() => initResize(retryCount + 1), 100);
        }
        return;
      }

      const shadowContent =
        shadowRoot.querySelector('main') || shadowRoot.children[0];
      if (!shadowContent) {
        if (retryCount < 50) {
          setTimeout(() => initResize(retryCount + 1), 100);
        }
        return;
      }

      const contentHeight = shadowContent.scrollHeight;

      if (contentHeight > 0 && !initialHeightSet) {
        const initialHeight = Math.min(contentHeight, config.maxInitialHeight);
        container.style.minHeight = `${config.minHeight}px`;
        container.style.maxHeight = `${config.maxInitialHeight}px`;
        container.style.height = `${initialHeight}px`;
        initialHeightSet = true;

        console.log(
          `Set initial height for ${stanzaId}: ${initialHeight}px (content: ${contentHeight}px)`
        );
      } else if (retryCount < 50) {
        setTimeout(() => initResize(retryCount + 1), 100);
      }
    };

    // 初期化開始
    setTimeout(() => initResize(), 500);

    // ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      if (!initialHeightSet) return;

      if (!container.classList.contains('resized')) {
        container.classList.add('resized');
        container.style.maxHeight = 'none';
        console.log(`Removed max-height for ${stanzaId}`);
      }
    });

    resizeObserver.observe(container);
  });
}
