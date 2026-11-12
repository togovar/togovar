interface HoverDropdownOptions {
  container: HTMLElement;
  triggerSelector: string;
  panel: HTMLElement;
  onOpen?: (trigger: HTMLElement) => void;
  onClose?: () => void;
  canClose?: () => boolean;
}

const CLOSE_DELAY_MS = 120;

/** 動的な「+N」ボタンも含めて同じ操作にするため、イベント委譲でパネルの開閉だけを管理する。 */
export class HoverDropdown {
  private trigger: HTMLElement | null = null;
  private closeTimer: number | null = null;
  private focusTimer: number | null = null;
  private suppressFocusOpen = false;
  private readonly events = new AbortController();

  /** 内容の生成やドラッグは呼び出し元に残し、hover・focus・クリックの判定を一箇所で揃える。 */
  constructor(private readonly options: HoverDropdownOptions) {
    const { container, panel, triggerSelector } = options;
    panel.hidden = true;
    panel.inert = true;
    panel.setAttribute('aria-hidden', 'true');
    const { signal } = this.events;

    /** 子要素間の移動でもイベントが届くため、現在のボタンかパネルへの進入だけを扱う。 */
    const enter = (event: Event): void => {
      if (this.suppressFocusOpen || !(event.target instanceof Element)) return;
      const trigger = event.target.closest<HTMLElement>(triggerSelector);
      if (trigger && container.contains(trigger)) this.open(trigger);
      else if (panel.contains(event.target)) this.cancelClose();
    };
    container.addEventListener('mouseover', enter, { signal });
    container.addEventListener('focusin', enter, { signal });
    // タッチで先行する mouseover の直後に閉じないよう、クリックは開く操作に限定する。
    container.addEventListener('click', enter, { signal });
    container.addEventListener(
      'mouseout',
      (event) => {
        if (!(event.target instanceof Node) || !this.contains(event.target))
          return;
        if (
          event.relatedTarget instanceof Node &&
          this.contains(event.relatedTarget)
        )
          return;
        this.scheduleClose();
      },
      { signal }
    );
    container.addEventListener(
      'focusout',
      () => {
        if (this.focusTimer !== null) window.clearTimeout(this.focusTimer);
        // フォーカス移動先が確定する前に閉じると、パネル内への Tab 移動を妨げるため待つ。
        this.focusTimer = window.setTimeout(() => {
          this.focusTimer = null;
          if (
            this.contains(document.activeElement) ||
            this.trigger?.matches(':hover') ||
            panel.matches(':hover')
          )
            return;
          if (options.canClose?.() !== false) this.close();
        }, 0);
      },
      { signal }
    );
    document.addEventListener(
      'click',
      (event) => {
        if (event.target instanceof Node && !this.contains(event.target))
          this.close();
      },
      { signal }
    );
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') this.close(true);
      },
      { signal }
    );
  }

  /** パネルまでの隙間や子要素への移動で閉じないよう、ボタンとパネルを一つの領域として扱う。 */
  private contains(node: Node | null): boolean {
    return (
      !!node &&
      !!this.trigger &&
      (this.trigger.contains(node) || this.options.panel.contains(node))
    );
  }

  /** 同じボタンへの再進入では内容を再生成せず、スクロール位置とフォーカスを維持する。 */
  private open(trigger: HTMLElement): void {
    this.cancelClose();
    if (this.trigger === trigger) return;
    this.close();
    this.trigger = trigger;
    trigger.setAttribute('aria-expanded', 'true');
    const { panel } = this.options;
    panel.hidden = false;
    panel.inert = false;
    panel.setAttribute('aria-hidden', 'false');
    this.options.onOpen?.(trigger);
  }

  /** Esc の後に操作を続けられるよう、要求された場合だけ元のボタンへフォーカスを戻す。 */
  close(restoreFocus = false): void {
    this.cancelClose();
    const trigger = this.trigger;
    if (!trigger) return;
    this.trigger = null;
    trigger.setAttribute('aria-expanded', 'false');
    this.options.onClose?.();
    const { panel } = this.options;
    panel.hidden = true;
    panel.inert = true;
    panel.setAttribute('aria-hidden', 'true');
    if (restoreFocus) {
      this.suppressFocusOpen = true;
      trigger.focus();
      this.suppressFocusOpen = false;
    }
  }

  /** ボタンとパネルの隙間をまたげるよう、ドラッグ中以外は少し待って閉じる。 */
  scheduleClose(): void {
    this.cancelClose();
    if (this.options.canClose?.() === false) return;
    this.closeTimer = window.setTimeout(() => {
      this.closeTimer = null;
      if (this.options.canClose?.() !== false) this.close();
    }, CLOSE_DELAY_MS);
  }

  /** パネルへの再進入やドラッグ開始後に、古い予約で閉じてしまうのを防ぐ。 */
  cancelClose(): void {
    if (this.closeTimer !== null) window.clearTimeout(this.closeTimer);
    this.closeTimer = null;
  }

  /** 破棄後にタイマーや document の監視が残らないよう、開閉状態とイベントをまとめて解放する。 */
  destroy(): void {
    this.close();
    this.events.abort();
    if (this.focusTimer !== null) window.clearTimeout(this.focusTimer);
    this.focusTimer = null;
  }
}
