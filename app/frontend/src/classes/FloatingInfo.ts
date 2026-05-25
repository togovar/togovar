import {
  arrow,
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from '@floating-ui/dom';

declare const require: (path: string) => unknown;

type TooltipEntry = {
  id: string;
  content: string;
  url?: string;
};

const tooltipData = require('../../assets/tooltips.json') as TooltipEntry[];

type FloatingInfoElements = {
  floatingInfoEl: HTMLDivElement;
  arrowEl: HTMLDivElement;
};

type Cleanup = () => void;

type BoundFloatingInfo = {
  floatingInfoEl: HTMLDivElement;
  dispose: () => void;
};

type BasePlacement = 'top' | 'right' | 'bottom' | 'left';

const STATIC_SIDE: Record<BasePlacement, BasePlacement> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]',
].join(',');

// data-tooltip-id を持つ要素に、対応する補足情報を Floating UI で表示する。
export default class FloatingInfo {
  private readonly data = this.getData();

  private readonly boundFloatingInfo = new Map<
    HTMLElement,
    BoundFloatingInfo
  >();

  private readonly observer: MutationObserver;

  private tooltipIdSequence = 0;

  constructor() {
    this.attachAll(document);

    // 検索結果などで DOM が再生成された場合も、新しい tooltip 対象を自動で拾う。
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => this.detachNode(node));
        mutation.addedNodes.forEach((node) => this.attachNode(node));
      });
    });

    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  public dispose(): void {
    this.observer.disconnect();
    this.boundFloatingInfo.forEach((boundFloatingInfo) => {
      boundFloatingInfo.dispose();
    });
    this.boundFloatingInfo.clear();
  }

  // tooltips.json の id と data-tooltip-id を突き合わせて表示内容を取得する。
  private getData(): readonly TooltipEntry[] {
    Object.freeze(tooltipData);

    return tooltipData as readonly TooltipEntry[];
  }

  // 指定範囲内にある tooltip 対象をまとめて初期化する。
  public attachAll(root: ParentNode = document): void {
    root
      .querySelectorAll<HTMLElement>('[data-tooltip-id]')
      .forEach((htmlElement) => {
        this.setTooltip(htmlElement);
      });
  }

  private attachNode(node: Node): void {
    if (!(node instanceof HTMLElement)) return;

    if (node.matches('[data-tooltip-id]')) this.setTooltip(node);
    this.attachAll(node);
  }

  private detachNode(node: Node): void {
    if (!(node instanceof HTMLElement)) return;

    if (node.matches('[data-tooltip-id]')) this.disposeTooltip(node);
    node.querySelectorAll<HTMLElement>('[data-tooltip-id]').forEach((el) => {
      this.disposeTooltip(el);
    });
  }

  private disposeTooltip(el: HTMLElement): void {
    const bound = this.boundFloatingInfo.get(el);

    if (!bound) return;

    bound.dispose();
    this.boundFloatingInfo.delete(el);
  }

  // 対象要素ごとに表示・非表示イベントと位置計算を設定する。
  private setTooltip(el: HTMLElement): void {
    if (this.boundFloatingInfo.has(el)) return;

    const id = el.getAttribute('data-tooltip-id');

    try {
      const tooltip = this.data.find((entry) => entry.id === id);

      if (!tooltip) throw new Error(`Tooltip data is missing for ${id}`);

      const template = this.createTemplate(tooltip),
        { floatingInfoEl, arrowEl } = this.createFloatingInfoElement(template);

      let cleanup: Cleanup | null = null,
        showTimer: number | null = null,
        hideTimer: number | null = null,
        isVisible = false;

      const addedTabIndex = this.ensureFocusable(el),
        isKeyboardAccessible = el.matches(FOCUSABLE_SELECTOR);

      const updatePosition = (): Promise<void> => {
          const [crossAxis, mainAxis] = this.offset(el);

          return computePosition(el, floatingInfoEl, {
            placement: 'top',
            middleware: [
              offset({ mainAxis, crossAxis }),
              flip(),
              shift({ padding: 8 }),
              arrow({ element: arrowEl }),
            ],
          }).then(({ x, y, placement, middlewareData }) => {
            const { x: arrowX, y: arrowY } = middlewareData.arrow || {},
              basePlacement = placement.split('-')[0] as BasePlacement,
              staticSide = STATIC_SIDE[basePlacement];

            Object.assign(floatingInfoEl.style, {
              left: `${x}px`,
              top: `${y}px`,
            });

            floatingInfoEl.setAttribute('data-placement', placement);

            // 矢印は Floating UI の計算値に合わせ、表示方向の反対側へ固定する。
            Object.assign(arrowEl.style, {
              left: arrowX != null ? `${arrowX}px` : '',
              top: arrowY != null ? `${arrowY}px` : '',
              right: '',
              bottom: '',
              [staticSide]: '-6px',
            });
          });
        },
        showFloatingInfo = (): Promise<void> => {
          if (hideTimer !== null) window.clearTimeout(hideTimer);

          if (isVisible) return updatePosition();

          isVisible = true;

          // 初回の位置計算が終わるまでは hidden/inert のままにし、
          // 左上に一瞬表示されることや、非表示要素がフォーカス可能になることを防ぐ。
          return updatePosition().then(() => {
            if (!isVisible) return;

            this.setFloatingInfoHidden(floatingInfoEl, false);
            floatingInfoEl.setAttribute('data-state', 'visible');
            if (isKeyboardAccessible) el.setAttribute('aria-expanded', 'true');
            cleanup = autoUpdate(el, floatingInfoEl, updatePosition);
          });
        },
        show = () => {
          if (hideTimer !== null) window.clearTimeout(hideTimer);
          if (showTimer !== null) window.clearTimeout(showTimer);

          showTimer = window.setTimeout(() => {
            showFloatingInfo();
          }, 300);
        },
        hideFloatingInfo = () => {
          if (showTimer !== null) window.clearTimeout(showTimer);
          if (hideTimer !== null) window.clearTimeout(hideTimer);

          isVisible = false;
          floatingInfoEl.setAttribute('data-state', 'hidden');
          this.setFloatingInfoHidden(floatingInfoEl, true);
          if (isKeyboardAccessible) el.setAttribute('aria-expanded', 'false');
          if (cleanup) cleanup();
          cleanup = null;
        },
        hide = () => {
          if (showTimer !== null) window.clearTimeout(showTimer);

          hideTimer = window.setTimeout(() => {
            if (this.containsFocus(el, floatingInfoEl)) return;

            hideFloatingInfo();
          }, 300);
        },
        hideOnFocusOut = (event: FocusEvent) => {
          if (this.containsTarget(el, floatingInfoEl, event.relatedTarget))
            return;

          hide();
        },
        keydown = (event: KeyboardEvent) => {
          if (event.key === 'Escape') {
            hideFloatingInfo();
            el.focus();
            return;
          }

          if (event.key !== 'Enter' && event.key !== ' ') return;

          const firstFocusable =
            floatingInfoEl.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);

          if (!firstFocusable) return;

          event.preventDefault();
          showFloatingInfo().then(() => firstFocusable.focus());
        };

      document.body.appendChild(floatingInfoEl);
      floatingInfoEl.id = this.createFloatingInfoId(id);
      el.setAttribute('aria-describedby', floatingInfoEl.id);
      if (isKeyboardAccessible) {
        el.setAttribute('aria-controls', floatingInfoEl.id);
        el.setAttribute('aria-expanded', 'false');
      }

      el.addEventListener('mouseenter', show);
      el.addEventListener('mouseleave', hide);
      floatingInfoEl.addEventListener('mouseenter', show);
      floatingInfoEl.addEventListener('mouseleave', hide);
      if (isKeyboardAccessible) {
        el.addEventListener('focus', show);
        el.addEventListener('focusout', hideOnFocusOut);
        el.addEventListener('keydown', keydown);
        floatingInfoEl.addEventListener('focusin', show);
        floatingInfoEl.addEventListener('focusout', hideOnFocusOut);
        floatingInfoEl.addEventListener('keydown', keydown);
      }

      this.boundFloatingInfo.set(el, {
        floatingInfoEl,
        dispose: () => {
          if (showTimer !== null) window.clearTimeout(showTimer);
          if (hideTimer !== null) window.clearTimeout(hideTimer);
          if (cleanup) cleanup();

          el.removeEventListener('mouseenter', show);
          el.removeEventListener('mouseleave', hide);
          floatingInfoEl.removeEventListener('mouseenter', show);
          floatingInfoEl.removeEventListener('mouseleave', hide);
          if (isKeyboardAccessible) {
            el.removeEventListener('focus', show);
            el.removeEventListener('focusout', hideOnFocusOut);
            el.removeEventListener('keydown', keydown);
            floatingInfoEl.removeEventListener('focusin', show);
            floatingInfoEl.removeEventListener('focusout', hideOnFocusOut);
            floatingInfoEl.removeEventListener('keydown', keydown);
          }
          el.removeAttribute('aria-describedby');
          el.removeAttribute('aria-controls');
          el.removeAttribute('aria-expanded');
          if (addedTabIndex) el.removeAttribute('tabindex');
          floatingInfoEl.remove();
        },
      });
    } catch (err) {
      console.error(
        `Failed to set the tooltip for item with a data-tooltip id of [${id}].\nCheck if there is corresponding data in tooltips.json`,
        err
      );
    }
  }

  // JSON の content/url から、表示する本文テンプレートを組み立てる。
  private createTemplate(tooltip: TooltipEntry): HTMLSpanElement {
    const template = document.createElement('span'),
      contentP = document.createElement('p');

    contentP.className = 'content';
    contentP.innerText = tooltip.content;
    // URL がある項目だけ詳細リンクを追加する。
    if (tooltip.url) contentP.appendChild(this.createAnchor(tooltip));
    template.appendChild(contentP);

    return template;
  }

  // Floating UI で位置制御する外枠と矢印要素を作成する。
  private createFloatingInfoElement(
    template: HTMLSpanElement
  ): FloatingInfoElements {
    const floatingInfoEl = document.createElement('div'),
      arrowEl = document.createElement('div');

    floatingInfoEl.className = 'floating-info';
    floatingInfoEl.setAttribute('role', 'tooltip');
    floatingInfoEl.setAttribute('data-state', 'hidden');
    this.setFloatingInfoHidden(floatingInfoEl, true);
    floatingInfoEl.appendChild(template);

    arrowEl.className = 'floating-info-arrow';
    floatingInfoEl.appendChild(arrowEl);

    return { floatingInfoEl, arrowEl };
  }

  private createFloatingInfoId(id: string | null): string {
    this.tooltipIdSequence += 1;
    return `tooltip-${id || 'unknown'}-${this.tooltipIdSequence}`;
  }

  private createAnchor(tooltip: TooltipEntry): HTMLAnchorElement {
    const anchor = document.createElement('a');

    anchor.className = 'url';
    anchor.href = tooltip.url || '';
    anchor.innerText = this.getAnchorText(tooltip);
    anchor.setAttribute('aria-label', `Read more about ${tooltip.content}`);

    return anchor;
  }

  private getAnchorText(tooltip: TooltipEntry): string {
    switch (tooltip.id) {
      case 'table-header-alt_frequency':
      case 'variant-frequency':
        return 'Read frequency help';
      case 'table-header-consequence':
        return 'Read consequence help';
      case 'table-header-sift':
      case 'table-header-polyphen':
      case 'table-header-alphamissense':
        return 'Read prediction help';
      case 'table-header-clinical_significance':
        return 'Read clinical significance help';
      default:
        return 'Read related help';
    }
  }

  // 非インタラクティブ要素は、明示されたものだけキーボードフォーカス対象にする。
  private ensureFocusable(el: HTMLElement): boolean {
    if (el.matches(FOCUSABLE_SELECTOR)) return false;
    if (!el.hasAttribute('data-tooltip-focusable')) return false;

    el.setAttribute('tabindex', '0');
    return true;
  }

  // 非表示中の tooltip 内リンクへ Tab 移動しないよう、支援技術とフォーカス対象から外す。
  private setFloatingInfoHidden(
    floatingInfoEl: HTMLElement,
    isHidden: boolean
  ): void {
    if (isHidden) {
      floatingInfoEl.setAttribute('aria-hidden', 'true');
      floatingInfoEl.setAttribute('inert', '');
      return;
    }

    floatingInfoEl.removeAttribute('aria-hidden');
    floatingInfoEl.removeAttribute('inert');
  }

  private containsFocus(el: HTMLElement, floatingInfoEl: HTMLElement): boolean {
    return this.containsTarget(el, floatingInfoEl, document.activeElement);
  }

  private containsTarget(
    el: HTMLElement,
    floatingInfoEl: HTMLElement,
    target: EventTarget | null
  ): boolean {
    return (
      target instanceof Node &&
      (el.contains(target) || floatingInfoEl.contains(target))
    );
  }

  // 回転している要素では見た目の中心に近づくよう、横方向の offset を補正する。
  private offset(el: HTMLElement): [number, number] {
    const style = window.getComputedStyle(el),
      props = el.getBoundingClientRect();

    if (style.transform === 'none') return [3, 7];
    return [props.width * 0.15 < 10 ? props.width * 0.1 : props.width * 0.2, 2];
  }
}
