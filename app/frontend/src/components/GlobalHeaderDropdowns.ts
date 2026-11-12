import { HoverDropdown } from './HoverDropdown';

/** 全ページにあるヘッダーでも検索結果と同じ操作を使い、レスポンシブ切替時は通常のナビ表示へ戻す。 */
export function initializeGlobalHeaderDropdowns(): () => void {
  const reference = document.querySelector<HTMLElement>(
    '#GlobalHeader .dropdown-view'
  );
  const referencePanel = reference?.querySelector<HTMLElement>(
    '.selectshow > .list'
  );
  const referenceDropdown =
    reference && referencePanel
      ? new HoverDropdown({
          container: reference,
          triggerSelector: '.button',
          panel: referencePanel,
          onOpen: () => reference.classList.add('-open'),
          onClose: () => reference.classList.remove('-open'),
        })
      : null;

  const navigation = document.querySelector<HTMLElement>(
    '#GlobalHeader > .right'
  );
  const navigationPanel =
    navigation?.querySelector<HTMLElement>('.menu-wrapper');
  const mobile = window.matchMedia('(max-width: 1120px)');
  let navigationDropdown: HoverDropdown | null = null;

  /** デスクトップのリンクを hidden / inert に残さないよう、ドロップダウンは狭い画面でだけ有効にする。 */
  const updateNavigation = (): void => {
    if (!navigation || !navigationPanel) return;
    navigationDropdown?.destroy();
    navigationDropdown = null;
    if (mobile.matches) {
      navigationDropdown = new HoverDropdown({
        container: navigation,
        triggerSelector: '.menu-bar',
        panel: navigationPanel,
        onOpen: () => navigation.classList.add('-open'),
        onClose: () => navigation.classList.remove('-open'),
      });
    } else {
      navigationPanel.hidden = false;
      navigationPanel.inert = false;
      navigationPanel.removeAttribute('aria-hidden');
    }
  };
  mobile.addEventListener('change', updateNavigation);
  updateNavigation();

  /** 通常のページ離脱では監視を解放し、bfcache に入る場合は呼び出し元で維持する。 */
  return () => {
    referenceDropdown?.destroy();
    navigationDropdown?.destroy();
    mobile.removeEventListener('change', updateNavigation);
  };
}
