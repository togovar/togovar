import { storeManager } from '../../store/StoreManager';
import { fetchDiseaseNode } from '../../api/diseaseInspect';
import { createEl } from '../../utils/dom/createEl';
import type { StoreState } from '../../types/storeState';
import {
  collectSimpleSearchReportLinks,
  resolveAdvancedSearchReportLinks,
  type ReportLink,
} from './reportLinkResolvers';

// 表示幅に収まらない分は fitGroups() で省略するが、疾患カテゴリ展開などで DOM が膨らみすぎないよう上限を置く
const MAX_LINKS_PER_KIND = 100;

// 「…」ボタンの aria-controls から参照するため、省略リンク一覧パネルの id を固定する
const MORE_PANEL_ID = 'ResultsReportLinksMore';
// Columns ドロップダウンと同じく、ボタンとパネルの隙間をまたぐ間は閉じないよう少し待つ
const HOVER_CLOSE_DELAY_MS = 120;
const ELLIPSIS_SELECTOR = '.group > .ellipsis';

const GROUP_LABELS: Record<ReportLink['kind'], string> = {
  gene: 'Gene report:',
  disease: 'Disease report:',
};

/**
 * 検索結果ヘッダーの件数表示の下に、検索語・検索条件に対応する Gene/Disease レポートへのリンクを表示する。
 * 結果行のリンクは選択した1バリアントに紐づくため、検索した遺伝子・疾患そのものへの導線を別に用意する。
 */
export class ResultsReportLinks {
  private readonly container: HTMLElement;
  private frameId: number | null = null;
  // Advanced Search の疾患変換は非同期のため、古い検索の結果で上書きしないよう世代を数える
  private generation = 0;
  // スクロールでページが追加されるたびにリンクが入れ替わらないよう、Simple Search では検索ごとに結果を固定する
  private simpleSearchSnapshot: { key: string; links: ReportLink[] } | null = null;
  // 内容が同じなら DOM を作り直さず、リンクに当たっているキーボードフォーカスを維持する
  private renderedKey: string | null = null;
  // 幅の変化でリンクの収まり方が変わるため、コンテナの幅を監視して省略をやり直す
  private resizeObserver: ResizeObserver | null = null;
  private fitFrameId: number | null = null;
  // 省略されたリンクの一覧パネル。行の overflow: hidden に切られないよう、行の外（コンテナ直下）に置く
  private readonly morePanel: HTMLElement;
  private readonly moreList: HTMLElement;
  // パネルを開いた「…」ボタン。閉じたときにフォーカスを戻すため保持する
  private moreButton: HTMLButtonElement | null = null;
  private hoverCloseTimer: number | null = null;
  // Esc で閉じてフォーカスを「…」へ戻すとき、focusin で再び開かないようにする
  private suppressFocusOpen = false;
  private readonly eventAbortController = new AbortController();

  // unsubscribe で同一参照が必要なため、束縛済みコールバックをフィールドに保持する
  private readonly onStoreChange = () => this.scheduleUpdate();

  /** 検索モード・条件・結果のどれが変わってもリンクが変わり得るため、すべて購読する。 */
  constructor(container: HTMLElement) {
    this.container = container;
    this.moreList = createEl('ul', { class: 'list' });
    this.morePanel = createEl('div', {
      class: 'more-panel',
      attrs: { id: MORE_PANEL_ID },
      domProps: { hidden: true },
      children: [this.moreList],
    });
    this.bindMoreEvents();
    storeManager.subscribe('searchMode', this.onStoreChange);
    storeManager.subscribe('simpleSearchConditions', this.onStoreChange);
    storeManager.subscribe('advancedSearchConditions', this.onStoreChange);
    storeManager.subscribe('searchResults', this.onStoreChange);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleFit());
      this.resizeObserver.observe(container);
    }
    // アイコンフォント読み込み後にリンク幅が変わるため、読み込み完了時にも省略をやり直す
    void document.fonts?.ready.then(() => this.scheduleFit());
    this.scheduleUpdate();
  }

  /** ResultsView の破棄に合わせて購読と予約済み描画を解除し、破棄後の描画を防ぐ。 */
  destroy(): void {
    storeManager.unsubscribe('searchMode', this.onStoreChange);
    storeManager.unsubscribe('simpleSearchConditions', this.onStoreChange);
    storeManager.unsubscribe('advancedSearchConditions', this.onStoreChange);
    storeManager.unsubscribe('searchResults', this.onStoreChange);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.eventAbortController.abort();
    this.cancelHoverClose();
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    if (this.fitFrameId !== null) cancelAnimationFrame(this.fitFrameId);
    this.fitFrameId = null;
    this.generation++;
  }

  /** リサイズ中は連続で通知が来るため、次フレームにまとめて1回だけ省略を計算する。 */
  private scheduleFit(): void {
    if (this.fitFrameId !== null) return;
    this.fitFrameId = requestAnimationFrame(() => {
      this.fitFrameId = null;
      this.fitGroups();
    });
  }

  /**
   * 1行に収まらないリンクを末尾から丸ごと非表示にし、代わりに「…」ボタンを出す。
   * CSS の text-overflow では隠れたリンクが透明なままクリック・フォーカスできてしまうため、JS で hidden にする。
   */
  private fitGroups(): void {
    if (this.container.hidden) return;
    // 省略される件数が変わり得るため、開いている一覧は閉じてから計算し直す
    this.closeMorePanel(false);
    for (const group of this.container.querySelectorAll<HTMLElement>(':scope > .group')) {
      const anchors = Array.from(group.querySelectorAll<HTMLElement>(':scope > .hyper-text'));
      const ellipsis = group.querySelector<HTMLButtonElement>(':scope > .ellipsis');
      if (!ellipsis) continue;

      anchors.forEach((anchor) => (anchor.hidden = false));
      ellipsis.hidden = true;
      // 上限で最初から描画していない分があれば、幅に収まっていても「…」から辿れるようにする
      const notRendered = Number(group.dataset.total) - anchors.length;
      if (group.scrollWidth <= group.clientWidth && notRendered <= 0) continue;

      // 「…」の幅も含めて収まるまで、末尾のリンクから順に隠す
      ellipsis.hidden = false;
      let hiddenCount = 0;
      for (let i = anchors.length - 1; i >= 0; i--) {
        if (group.scrollWidth <= group.clientWidth) break;
        anchors[i].hidden = true;
        hiddenCount++;
      }

      const more = hiddenCount + Math.max(notRendered, 0);
      const label = `Show ${more} more ${group.dataset.kind} ${more === 1 ? 'report' : 'reports'}`;
      ellipsis.title = label;
      ellipsis.setAttribute('aria-label', label);
    }
  }

  /**
   * 同じヘッダーの Columns ドロップダウンに操作をそろえ、hover / focus で開き、外れたら少し待って閉じる。
   * 行は描画のたびに作り直されるため、個々のボタンではなくコンテナと document で委譲して扱う。
   */
  private bindMoreEvents(): void {
    const { signal } = this.eventAbortController;

    // hover：「…」に乗ったら開き、パネルへ移動している間は閉じない
    this.container.addEventListener(
      'mouseover',
      (event) => {
        const target = event.target as Element | null;
        const button = target?.closest<HTMLButtonElement>(ELLIPSIS_SELECTOR);
        if (button) {
          this.cancelHoverClose();
          if (this.moreButton !== button) this.openMorePanel(button);
        } else if (target && this.morePanel.contains(target)) {
          this.cancelHoverClose();
        }
      },
      { signal }
    );

    // hover 解除：ボタンとパネルのどちらからも外れたときだけ閉じる予約をする
    this.container.addEventListener(
      'mouseout',
      (event) => {
        if (!this.moreButton) return;
        const target = event.target as Node | null;
        if (!target || !this.isInMoreArea(target)) return;
        const related = event.relatedTarget as Node | null;
        if (related && this.isInMoreArea(related)) return;
        this.scheduleHoverClose();
      },
      { signal }
    );

    // タッチ操作では hover が無いため、クリックでも開く（開閉の切り替えにすると、
    // タッチ時に先行する mouseover で開いた直後に閉じてしまうため、開くだけにする）
    this.container.addEventListener(
      'click',
      (event) => {
        const button = (event.target as Element | null)?.closest<HTMLButtonElement>(ELLIPSIS_SELECTOR);
        if (!button) return;
        this.cancelHoverClose();
        if (this.moreButton !== button) this.openMorePanel(button);
      },
      { signal }
    );

    // キーボード操作では focus で開き、ボタンとパネルの外へフォーカスが出たら閉じる
    this.container.addEventListener(
      'focusin',
      (event) => {
        const target = event.target as Element | null;
        const button = target?.closest<HTMLButtonElement>(ELLIPSIS_SELECTOR);
        if (button) {
          if (this.suppressFocusOpen) return;
          this.cancelHoverClose();
          if (this.moreButton !== button) this.openMorePanel(button);
        } else if (target && this.morePanel.contains(target)) {
          this.cancelHoverClose();
        }
      },
      { signal }
    );

    this.container.addEventListener(
      'focusout',
      () => {
        // フォーカス移動先が確定してから判定するため、次のタスクまで待つ
        window.setTimeout(() => {
          if (!this.moreButton) return;
          const active = document.activeElement;
          if (active && this.isInMoreArea(active)) return;
          if (this.moreButton.matches(':hover') || this.morePanel.matches(':hover')) return;
          this.closeMorePanel(false);
        }, 0);
      },
      { signal }
    );

    document.addEventListener(
      'click',
      (event) => {
        if (!this.moreButton) return;
        const target = event.target as Node | null;
        if (target && this.isInMoreArea(target)) return;
        this.closeMorePanel(false);
      },
      { signal }
    );

    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key !== 'Escape' || !this.moreButton) return;
        this.closeMorePanel(true);
      },
      { signal }
    );
  }

  /** hover / focus の判定で、開いている「…」とパネルを1つの領域として扱うため。 */
  private isInMoreArea(node: Node): boolean {
    return !!this.moreButton && (this.moreButton.contains(node) || this.morePanel.contains(node));
  }

  /** ボタンとパネルの隙間をまたぐ間に閉じないよう、閉じるのを少し遅らせる。 */
  private scheduleHoverClose(): void {
    this.cancelHoverClose();
    this.hoverCloseTimer = window.setTimeout(() => {
      this.hoverCloseTimer = null;
      this.closeMorePanel(false);
    }, HOVER_CLOSE_DELAY_MS);
  }

  /** 再び hover / focus された場合に、予約済みの閉じる処理を取り消すため。 */
  private cancelHoverClose(): void {
    if (this.hoverCloseTimer === null) return;
    window.clearTimeout(this.hoverCloseTimer);
    this.hoverCloseTimer = null;
  }

  /**
   * hover / focus / クリックされた「…」の行で隠れているリンクを一覧に複製し、ボタンの下に表示する。
   * 行の DOM を動かすと省略計算が崩れるため、リンクは移動せず複製する。
   */
  private openMorePanel(button: HTMLButtonElement): void {
    this.closeMorePanel(false);
    const group = button.parentElement;
    if (!group) return;

    const items: HTMLElement[] = Array.from(
      group.querySelectorAll<HTMLElement>(':scope > .hyper-text[hidden]'),
      (anchor) => {
        const clone = anchor.cloneNode(true) as HTMLElement;
        clone.hidden = false;
        return createEl('li', { class: 'item', children: [clone] });
      }
    );
    const notRendered = Number(group.dataset.total) - group.querySelectorAll(':scope > .hyper-text').length;
    if (notRendered > 0) {
      items.push(createEl('li', { class: 'note', text: `and ${notRendered} more` }));
    }
    this.moreList.replaceChildren(...items);

    this.morePanel.hidden = false;
    this.moreButton = button;
    button.setAttribute('aria-expanded', 'true');

    // ボタンの真下に出し、右端（Columns ボタンの右端）からはみ出す場合だけ左へずらす
    const maxLeft = this.container.clientWidth - this.morePanel.offsetWidth;
    this.morePanel.style.top = `${group.offsetTop + group.offsetHeight + 2}px`;
    this.morePanel.style.left = `${Math.max(0, Math.min(button.offsetLeft, maxLeft))}px`;
  }

  /** 一覧を閉じる。Esc で閉じたときはキーボード操作を続けられるよう、フォーカスを「…」へ戻す。 */
  private closeMorePanel(restoreFocus: boolean): void {
    this.cancelHoverClose();
    const button = this.moreButton;
    if (!button) return;
    this.moreButton = null;
    this.morePanel.hidden = true;
    this.moreList.replaceChildren();
    button.setAttribute('aria-expanded', 'false');
    if (restoreFocus) {
      this.suppressFocusOpen = true;
      button.focus();
      this.suppressFocusOpen = false;
    }
  }

  /** スクロールによるページ追加などで結果が連続更新されるため、次フレームにまとめて1回だけ再計算する。 */
  private scheduleUpdate(): void {
    if (this.frameId !== null) return;
    this.frameId = requestAnimationFrame(() => {
      this.frameId = null;
      void this.update();
    });
  }

  /** 現在の検索モードに応じてリンクを集め、最新の検索のものだけを描画する。 */
  private async update(): Promise<void> {
    const generation = ++this.generation;
    const results = storeManager.getData('searchResults') ?? [];

    let links: ReportLink[] = [];
    if (storeManager.getData('searchMode') === 'advanced') {
      links = await resolveAdvancedSearchReportLinks(
        storeManager.getData('advancedSearchConditions'),
        results,
        fetchDiseaseNode
      );
    } else {
      links = this.getSimpleSearchLinks(results);
    }

    if (generation !== this.generation) return;
    this.render(links);
  }

  /**
   * Simple Search の結果APIは一致した遺伝子・疾患を返さないため、最初に届いた結果から推定し、
   * 同じ検索の間はその結果を使い続ける。後続ページにしか無い遺伝子・疾患は対象外になる（ベストエフォート）。
   * 新規検索では resultsResetVersion が進み結果が空に戻るため、それを検索の区切りとして扱う。
   */
  private getSimpleSearchLinks(results: StoreState['searchResults']): ReportLink[] {
    const loaded = results.some((result) => result !== null);
    if (!loaded) {
      this.simpleSearchSnapshot = null;
      return [];
    }

    const term = storeManager.getData('simpleSearchConditions')?.term;
    const key = `${storeManager.getData('resultsResetVersion')}\n${term ?? ''}`;
    if (this.simpleSearchSnapshot?.key === key) return this.simpleSearchSnapshot.links;

    const links = collectSimpleSearchReportLinks(term, results);
    this.simpleSearchSnapshot = { key, links };
    return links;
  }

  /**
   * 遺伝子と疾患を種類ごとの行に分けて並べ、該当が無ければ領域ごと隠す。
   * 各行は1行固定で、幅に収まらない分は fitGroups() でリンク単位に省略する。
   */
  private render(links: ReportLink[]): void {
    const key = JSON.stringify(links.map(({ kind, label, href }) => [kind, label, href]));
    if (key === this.renderedKey) return;
    this.renderedKey = key;

    const groups = (['gene', 'disease'] as const)
      .map((kind) => ({ kind, items: links.filter((link) => link.kind === kind) }))
      .filter(({ items }) => items.length > 0)
      .map(({ kind, items }) => {
        const anchors = items.slice(0, MAX_LINKS_PER_KIND).map((link) =>
          createEl('a', {
            class: 'hyper-text -internal',
            attrs: {
              href: link.href,
              'aria-label': `View ${link.kind} ${link.label} details`,
            },
            text: link.label,
          })
        );

        return createEl('div', {
          class: 'group',
          // total は上限で描画しなかった件数を fitGroups() / 一覧で求めるために持たせる
          dataset: { kind, total: String(items.length) },
          children: [
            createEl('span', { class: 'label', text: GROUP_LABELS[kind] }),
            ...anchors,
            // 省略時だけ fitGroups() が表示し、hover / focus で隠れたリンクの一覧を開く
            createEl('button', {
              class: 'ellipsis',
              attrs: { type: 'button', 'aria-expanded': 'false', 'aria-controls': MORE_PANEL_ID },
              domProps: { hidden: true },
              text: '…',
            }),
          ],
        });
      });

    // 行を作り直すと開いていた一覧の対象が無くなるため、先に閉じる
    this.closeMorePanel(false);
    this.container.replaceChildren(...groups, this.morePanel);
    this.container.hidden = groups.length === 0;
    this.fitGroups();
  }
}
