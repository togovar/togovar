import {
  arrow,
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from '@floating-ui/dom';
import tooltipData from '../../assets/tooltips.json';

type TooltipEntry = {
  id: string;
  content: string;
  url?: string;
};

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

// data-tooltip-id を持つ要素に、対応する補足情報を Floating UI で表示する。
export default class FloatingInfo {
  private readonly data = this.getData();

  private readonly boundFloatingInfo = new Map<HTMLElement, BoundFloatingInfo>();

  private readonly observer: MutationObserver;

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
        show = () => {
          if (hideTimer !== null) window.clearTimeout(hideTimer);

          showTimer = window.setTimeout(() => {
            if (isVisible) return;

            isVisible = true;

            // 初回の位置計算が終わるまでは hidden のままにし、左上に一瞬表示されるのを防ぐ。
            updatePosition().then(() => {
              if (!isVisible) return;

              floatingInfoEl.setAttribute('data-state', 'visible');
              cleanup = autoUpdate(el, floatingInfoEl, updatePosition);
            });
          }, 300);
        },
        hide = () => {
          if (showTimer !== null) window.clearTimeout(showTimer);

          hideTimer = window.setTimeout(() => {
            isVisible = false;
            floatingInfoEl.setAttribute('data-state', 'hidden');
            if (cleanup) cleanup();
            cleanup = null;
          }, 300);
        };

      document.body.appendChild(floatingInfoEl);
      floatingInfoEl.id = `tooltip-${id}`;
      el.setAttribute('aria-describedby', floatingInfoEl.id);

      el.addEventListener('mouseenter', show);
      el.addEventListener('focus', show);
      el.addEventListener('mouseleave', hide);
      el.addEventListener('blur', hide);
      floatingInfoEl.addEventListener('mouseenter', show);
      floatingInfoEl.addEventListener('mouseleave', hide);

      this.boundFloatingInfo.set(el, {
        floatingInfoEl,
        dispose: () => {
          if (showTimer !== null) window.clearTimeout(showTimer);
          if (hideTimer !== null) window.clearTimeout(hideTimer);
          if (cleanup) cleanup();

          el.removeEventListener('mouseenter', show);
          el.removeEventListener('focus', show);
          el.removeEventListener('mouseleave', hide);
          el.removeEventListener('blur', hide);
          floatingInfoEl.removeEventListener('mouseenter', show);
          floatingInfoEl.removeEventListener('mouseleave', hide);
          el.removeAttribute('aria-describedby');
          floatingInfoEl.remove();
        },
      });
    } catch (err) {
      console.error(
        `Failed to set the tooltip for item with a data-tooltip id of [${id}].\nCheck if there is corresponding data in tooltips.JSON`
      );
    }
  }

  // JSON の content/url から、表示する本文テンプレートを組み立てる。
  private createTemplate(tooltip: TooltipEntry): HTMLSpanElement {
    const template = document.createElement('span'),
      contentP = document.createElement('p');

    contentP.className = 'content';
    contentP.innerText = tooltip.content;
    // URL がある項目だけ Read More リンクを追加する。
    if (tooltip.url) contentP.appendChild(this.createAnchor(tooltip.url));
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
    floatingInfoEl.appendChild(template);

    arrowEl.className = 'floating-info-arrow';
    floatingInfoEl.appendChild(arrowEl);

    return { floatingInfoEl, arrowEl };
  }

  private createAnchor(url: string): HTMLAnchorElement {
    const anchor = document.createElement('a');

    anchor.className = 'url';
    anchor.href = url;
    anchor.innerText = 'Read More';

    return anchor;
  }

  // 回転している要素では見た目の中心に近づくよう、横方向の offset を補正する。
  private offset(el: HTMLElement): [number, number] {
    const style = window.getComputedStyle(el),
      props = el.getBoundingClientRect();

    if (style.transform === 'none') return [3, 7];
    return [props.width * 0.15 < 10 ? props.width * 0.1 : props.width * 0.2, 2];
  }
}
