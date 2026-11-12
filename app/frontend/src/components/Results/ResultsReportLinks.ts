import { HoverDropdown } from '../HoverDropdown';
import { storeManager } from '../../store/StoreManager';
import { fetchDiseaseNode } from '../../api/diseaseInspect';
import { fitResultsPanelHeight } from './fitResultsPanelHeight';
import { createEl } from '../../utils/dom/createEl';
import type { StoreState } from '../../types/storeState';
import {
  collectSimpleSearchReportLinks,
  resolveAdvancedSearchReportLinks,
  type ReportLink,
} from './reportLinkResolvers';

// 表示幅に収まらない分は fitGroups() で省略するが、疾患カテゴリ展開などで DOM が膨らみすぎないよう上限を置く
const MAX_LINKS_PER_KIND = 100;

// 「+N」ボタンの aria-controls から参照するため、省略リンク一覧パネルの id を固定する
const MORE_PANEL_ID = 'ResultsReportLinksMore';
const MORE_BUTTON_SELECTOR = '.group > .more';

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
  private readonly dropdown: HoverDropdown;

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
    this.dropdown = new HoverDropdown({
      container,
      triggerSelector: MORE_BUTTON_SELECTOR,
      panel: this.morePanel,
      onOpen: (button) => this.openMorePanel(button),
      onClose: () => this.moreList.replaceChildren(),
    });
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
    this.dropdown.destroy();
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
   * 1行に収まらないリンクを末尾から丸ごと非表示にし、代わりに隠れた件数を示す「+N」ボタンを出す。
   * CSS の text-overflow では隠れたリンクが透明なままクリック・フォーカスできてしまうため、JS で hidden にする。
   */
  private fitGroups(): void {
    if (this.container.hidden) return;
    // 省略される件数が変わり得るため、開いている一覧は閉じてから計算し直す
    this.dropdown.close();
    for (const group of this.container.querySelectorAll<HTMLElement>(':scope > .group')) {
      const anchors = Array.from(group.querySelectorAll<HTMLElement>(':scope > .hyper-text'));
      const moreButton = group.querySelector<HTMLButtonElement>(':scope > .more');
      if (!moreButton) continue;

      anchors.forEach((anchor) => (anchor.hidden = false));
      moreButton.hidden = true;
      // 上限で最初から描画していない分があれば、幅に収まっていても「+N」から辿れるようにする
      const notRendered = Math.max(Number(group.dataset.total) - anchors.length, 0);
      if (group.scrollWidth <= group.clientWidth && notRendered === 0) continue;

      // 件数の桁が増えるとボタン幅も変わるため、1件隠すごとに表示を更新してから収まりを判定する
      let hiddenCount = 0;
      const updateCount = (): void => {
        moreButton.textContent = `+${hiddenCount + notRendered}`;
      };
      moreButton.hidden = false;
      updateCount();
      for (let i = anchors.length - 1; i >= 0; i--) {
        if (group.scrollWidth <= group.clientWidth) break;
        anchors[i].hidden = true;
        hiddenCount++;
        updateCount();
      }

      const more = hiddenCount + notRendered;
      const label = `Show ${more} more ${group.dataset.kind} ${more === 1 ? 'report' : 'reports'}`;
      moreButton.title = label;
      moreButton.setAttribute('aria-label', label);
    }
  }

  /**
   * 行の省略計算を崩さないよう、隠れたリンクは移動せず複製してボタンの下へ表示する。
   */
  private openMorePanel(button: HTMLElement): void {
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

    // ボタンの真下に出し、右端（Columns ボタンの右端）からはみ出す場合だけ左へずらす
    const maxLeft = this.container.clientWidth - this.morePanel.offsetWidth;
    this.morePanel.style.top = `${group.offsetTop + group.offsetHeight + 2}px`;
    this.morePanel.style.left = `${Math.max(0, Math.min(button.offsetLeft, maxLeft))}px`;
    fitResultsPanelHeight(this.morePanel);
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
            // 省略時だけ fitGroups() が件数を入れて表示し、hover / focus で隠れたリンクの一覧を開く。
            // 見た目は検索結果表のセルの「+N」と同じ remains-badge にそろえる
            createEl('button', {
              class: 'remains-badge more',
              attrs: { type: 'button', 'aria-expanded': 'false', 'aria-controls': MORE_PANEL_ID },
              domProps: { hidden: true },
            }),
          ],
        });
      });

    // 行を作り直すと開いていた一覧の対象が無くなるため、先に閉じる
    this.dropdown.close();
    this.container.replaceChildren(...groups, this.morePanel);
    this.container.hidden = groups.length === 0;
    this.fitGroups();
  }
}
