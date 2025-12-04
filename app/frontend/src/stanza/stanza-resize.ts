import { STANZA_RESIZE_CONFIG } from './stanza-resize-config';

interface HTMLElementWithShadowRoot extends HTMLElement {
  shadowRoot: ShadowRoot | null;
}

const STANZA_INITIALIZATION_DELAY_MS = 500;

export function initializeStanzaResize(): void {
  Object.entries(STANZA_RESIZE_CONFIG).forEach(([stanzaId, config]) => {
    const container = document.getElementById(stanzaId);
    if (!container) return;

    initializeStanza(container, config);
  });
}

function initializeStanza(
  container: HTMLElement,
  config: { minHeight: number; maxInitialHeight: number }
): void {
  let isManuallyResized = false;
  let previousContentHeight = 0;
  let lastSetHeight = 0;
  let isSettingHeight = false;

  const observers = {
    mutation: null as MutationObserver | null,
    shadowContentResize: null as ResizeObserver | null,
  };

  const findStanzaElement = (): HTMLElementWithShadowRoot | undefined => {
    const children = Array.from(container.children);
    return children.find((child) =>
      child.tagName.toLowerCase().startsWith('togostanza-')
    ) as HTMLElementWithShadowRoot | undefined;
  };

  const getShadowContent = (): HTMLElement | null => {
    const stanzaElement = findStanzaElement();
    if (!stanzaElement?.shadowRoot) return null;

    return (
      (stanzaElement.shadowRoot.querySelector('main') as HTMLElement) ||
      (stanzaElement.shadowRoot.children[0] as HTMLElement) ||
      null
    );
  };

  const setHeight = (height: number): void => {
    isSettingHeight = true;
    container.style.height = `${height}px`;
    lastSetHeight = height;
    requestAnimationFrame(() => {
      isSettingHeight = false;
    });
  };

  const markAsManuallyResized = (): void => {
    isManuallyResized = true;
    container.style.maxHeight = 'none';
    container.classList.add('resized');
  };

  const handleContentResize = (): void => {
    // 初期化（previousContentHeight = 0の場合のみ）
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

    // 手動リサイズ後の処理
    if (isManuallyResized) {
      if (currentContainerHeight >= config.maxInitialHeight) {
        previousContentHeight = currentContentHeight;
        return;
      }

      // 250px未満の場合、開閉時に250pxに設定
      if (currentContentHeight !== previousContentHeight) {
        setHeight(config.maxInitialHeight);
        previousContentHeight = currentContentHeight;
      }
      return;
    }

    // 手動リサイズの検出（250px超の場合）
    if (currentContainerHeight > config.maxInitialHeight) {
      // JavaScriptで未設定で、かつcontainer.style.heightが設定されている場合
      if (lastSetHeight === 0 && container.style.height) {
        previousContentHeight = currentContentHeight;
        markAsManuallyResized();
        return;
      }
    }

    // 開いた場合
    if (
      currentContentHeight > previousContentHeight &&
      currentContentHeight > 0
    ) {
      setHeight(config.maxInitialHeight);
      previousContentHeight = currentContentHeight;
    }
    // 閉じた場合（一度でも開いた後）
    else if (
      lastSetHeight > 0 &&
      currentContentHeight < previousContentHeight
    ) {
      setHeight(config.maxInitialHeight);
      previousContentHeight = currentContentHeight;
    }
    // 高さが変わらない場合
    else if (currentContentHeight > 0) {
      previousContentHeight = currentContentHeight;
    }
  };

  const startObservingShadowContent = (): void => {
    const shadowContent = getShadowContent();
    if (!shadowContent) return;

    observers.shadowContentResize?.disconnect();

    previousContentHeight = 0; // 初期化をトリガー
    handleContentResize();

    observers.shadowContentResize = new ResizeObserver(handleContentResize);

    requestAnimationFrame(() => {
      const currentShadowContent = getShadowContent();
      if (currentShadowContent && observers.shadowContentResize) {
        observers.shadowContentResize.observe(currentShadowContent);
      }
    });
  };

  // stanza要素の追加を監視
  observers.mutation = new MutationObserver(() => {
    const shadowContent = getShadowContent();
    if (shadowContent && !observers.shadowContentResize) {
      startObservingShadowContent();
    }
  });

  observers.mutation.observe(container, {
    childList: true,
    subtree: true,
  });

  setTimeout(startObservingShadowContent, STANZA_INITIALIZATION_DELAY_MS);

  // 手動リサイズの検出
  const containerResizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (isSettingHeight) return;

      const currentHeight = Math.round(entry.contentRect.height);

      // JavaScriptで高さを設定した後にのみ手動リサイズを検出
      if (
        !isManuallyResized &&
        lastSetHeight > 0 &&
        currentHeight !== lastSetHeight
      ) {
        markAsManuallyResized();

        if (currentHeight < config.maxInitialHeight) {
          setHeight(config.maxInitialHeight);
        } else {
          lastSetHeight = currentHeight;
        }

        observers.mutation?.disconnect();
      }
    }
  });

  containerResizeObserver.observe(container);
}
