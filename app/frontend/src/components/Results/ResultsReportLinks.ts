import { storeManager } from '../../store/StoreManager';
import { fetchDiseaseNode } from '../../api/diseaseInspect';
import { createEl } from '../../utils/dom/createEl';
import {
  collectSimpleSearchReportLinks,
  resolveAdvancedSearchReportLinks,
  type ReportLink,
} from './reportLinkResolvers';

// 疾患カテゴリなどで条件値が多い場合にヘッダーが膨らみすぎないよう、表示件数を絞る
const MAX_LINKS_PER_KIND = 10;

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

  // unsubscribe で同一参照が必要なため、束縛済みコールバックをフィールドに保持する
  private readonly onStoreChange = () => this.scheduleUpdate();

  /** 検索モード・条件・結果のどれが変わってもリンクが変わり得るため、すべて購読する。 */
  constructor(container: HTMLElement) {
    this.container = container;
    storeManager.subscribe('searchMode', this.onStoreChange);
    storeManager.subscribe('simpleSearchConditions', this.onStoreChange);
    storeManager.subscribe('advancedSearchConditions', this.onStoreChange);
    storeManager.subscribe('searchResults', this.onStoreChange);
    this.scheduleUpdate();
  }

  /** ResultsView の破棄に合わせて購読と予約済み描画を解除し、破棄後の描画を防ぐ。 */
  destroy(): void {
    storeManager.unsubscribe('searchMode', this.onStoreChange);
    storeManager.unsubscribe('simpleSearchConditions', this.onStoreChange);
    storeManager.unsubscribe('advancedSearchConditions', this.onStoreChange);
    storeManager.unsubscribe('searchResults', this.onStoreChange);
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.generation++;
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
      links = collectSimpleSearchReportLinks(
        storeManager.getData('simpleSearchConditions')?.term,
        results
      );
    }

    if (generation !== this.generation) return;
    this.render(links);
  }

  /** 遺伝子と疾患を種類ごとの行に分けて並べ、該当が無ければ領域ごと隠す。 */
  private render(links: ReportLink[]): void {
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
        const remains = items.length - MAX_LINKS_PER_KIND;
        const more =
          remains > 0 ? [createEl('span', { class: 'more', text: `+${remains} more` })] : [];

        return createEl('div', {
          class: 'group',
          dataset: { kind },
          children: [createEl('span', { class: 'label', text: GROUP_LABELS[kind] }), ...anchors, ...more],
        });
      });

    this.container.replaceChildren(...groups);
    this.container.hidden = groups.length === 0;
  }
}
