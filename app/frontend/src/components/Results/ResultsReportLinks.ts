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

  // unsubscribe で同一参照が必要なため、束縛済みコールバックをフィールドに保持する
  private readonly onStoreChange = () => this.scheduleUpdate();

  /** 検索モード・条件・結果のどれが変わってもリンクが変わり得るため、すべて購読する。 */
  constructor(container: HTMLElement) {
    this.container = container;
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
   * 1行に収まらないリンクを末尾から丸ごと非表示にし、代わりにクリックできない「…」を出す。
   * CSS の text-overflow では隠れたリンクが透明なままクリック・フォーカスできてしまうため、JS で hidden にする。
   */
  private fitGroups(): void {
    if (this.container.hidden) return;
    for (const group of this.container.querySelectorAll<HTMLElement>(':scope > .group')) {
      const anchors = Array.from(group.querySelectorAll<HTMLElement>(':scope > .hyper-text'));
      const ellipsis = group.querySelector<HTMLElement>(':scope > .ellipsis');
      if (!ellipsis) continue;

      anchors.forEach((anchor) => (anchor.hidden = false));
      ellipsis.hidden = true;
      if (group.scrollWidth <= group.clientWidth) continue;

      // 「…」の幅も含めて収まるまで、末尾のリンクから順に隠す
      ellipsis.hidden = false;
      for (let i = anchors.length - 1; i >= 0; i--) {
        anchors[i].hidden = true;
        if (group.scrollWidth <= group.clientWidth) break;
      }
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
        const visibleItems = items.slice(0, MAX_LINKS_PER_KIND);
        const anchors = visibleItems.map((link) =>
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
          dataset: { kind },
          // ellipsis で隠れた分もマウスオーバーで確認できるよう、全ラベルを title に入れる
          attrs: { title: visibleItems.map((link) => link.label).join(', ') },
          children: [
            createEl('span', { class: 'label', text: GROUP_LABELS[kind] }),
            ...anchors,
            // 省略時だけ fitGroups() が表示する。全件は title で読めるため、読み上げからは外す
            createEl('span', { class: 'ellipsis', attrs: { 'aria-hidden': 'true' }, domProps: { hidden: true }, text: '…' }),
          ],
        });
      });

    this.container.replaceChildren(...groups);
    this.container.hidden = groups.length === 0;
    this.fitGroups();
  }
}
