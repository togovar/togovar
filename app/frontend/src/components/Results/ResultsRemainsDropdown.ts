import { HoverDropdown } from '../HoverDropdown';
import { storeManager } from '../../store/StoreManager';
import { getSimpleSearchConditionMaster } from '../../store/search/searchManager';
import { createEl } from '../../utils/dom/createEl';
import { fitResultsPanelHeight } from './fitResultsPanelHeight';
import { ResultsColumnUpdater } from './ResultsColumnUpdater';
import { REMAINS_PANEL_ID } from './ResultsColumnTemplates';
import type { ConsequenceMasterItem, ResultData } from '../../types';

// レポートリンク行の「+N」（.remains-badge.more）と区別するため、表の行内のバッジだけを対象にする
const TRIGGER_SELECTOR = '.tablecontainer > table > tbody > tr > td .remains-badge';
// 下に十分な高さが無いときは上に開く。数件は見える高さを基準にする
const MIN_PANEL_HEIGHT_PX = 120;
const PANEL_GAP_PX = 2;

type PanelItem = { label: string; href?: string; external?: boolean };

/**
 * 検索結果表のセルの「+N」を hover / focus したときに、表示しきれなかった値の一覧を開く。
 * 表は overflow で切られるうえ行DOMが仮想スクロールで使い回されるため、パネルは表の外に1つだけ置き、
 * 開くたびにその行のレコードから内容を作る。
 */
export class ResultsRemainsDropdown {
  private readonly root: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly list: HTMLElement;
  private readonly dropdown: HoverDropdown;
  private readonly events = new AbortController();
  // 結果の更新で行の中身が変わったかを判定するため、開いている対象を覚えておく
  private trigger: HTMLElement | null = null;
  private record: ResultData | null = null;

  // 縦横スクロール・列変更で行の中身やバッジの位置が変わり、開いていた一覧の対象を見失うため閉じる
  private readonly onTableChange = () => this.dropdown.close();

  /**
   * 先読みしたページの到着でも searchResults は通知されるため、開いている行のレコードが変わったときだけ閉じる。
   * 通知中は isSearchResultsUpdating が true で getRecordByIndex が 'loading' を返すので、更新完了後に確かめる。
   */
  private readonly onSearchResults = () => {
    if (!this.trigger) return;
    queueMicrotask(() => {
      if (this.trigger && this.lookupRecord(this.trigger) !== this.record) this.dropdown.close();
    });
  };

  /** パネルを #ResultsView 直下に置き、表の overflow に切られないようにする。 */
  constructor(root: HTMLElement) {
    this.root = root;
    this.list = createEl('ul', { class: 'list' });
    this.panel = createEl('div', {
      class: 'remains-panel',
      attrs: { id: REMAINS_PANEL_ID },
      domProps: { hidden: true },
      children: [this.list],
    });
    root.append(this.panel);
    this.dropdown = new HoverDropdown({
      container: root,
      triggerSelector: TRIGGER_SELECTOR,
      panel: this.panel,
      onOpen: (trigger) => this.open(trigger),
      onClose: () => {
        this.trigger = null;
        this.record = null;
        this.list.replaceChildren();
      },
    });
    const { signal } = this.events;
    // 横スクロールでは offset が変わらず、パネルだけ元の位置に残ってしまうため閉じる
    root
      .querySelector<HTMLElement>('.tablecontainer')
      ?.addEventListener('scroll', this.onTableChange, { passive: true, signal });
    root.addEventListener('keydown', (event) => this.handleTab(event), { signal });
    storeManager.subscribe('offset', this.onTableChange);
    storeManager.subscribe('columns', this.onTableChange);
    storeManager.subscribe('searchResults', this.onSearchResults);
  }

  /** ResultsView の Escape（行選択の解除）が一覧を閉じる操作と重ならないよう、開いているかを公開する。 */
  isOpen(): boolean {
    return this.trigger !== null;
  }

  /** ResultsView の破棄に合わせて購読とパネルを解放する。 */
  destroy(): void {
    storeManager.unsubscribe('offset', this.onTableChange);
    storeManager.unsubscribe('columns', this.onTableChange);
    storeManager.unsubscribe('searchResults', this.onSearchResults);
    this.events.abort();
    this.dropdown.destroy();
    this.panel.remove();
  }

  /**
   * パネルは表の外（#ResultsView の末尾）にあり、Tab の既定の順では「+N」の次に来ないため、
   * 開いている間だけ「+N」とパネル内のリンクの間を Tab / Shift+Tab でつなぐ。
   */
  private handleTab(event: KeyboardEvent): void {
    const trigger = this.trigger;
    if (event.key !== 'Tab' || !trigger) return;
    const links = Array.from(this.panel.querySelectorAll<HTMLElement>('a[href]'));
    if (links.length === 0) return;
    const active = document.activeElement;

    if (active === trigger && !event.shiftKey) {
      event.preventDefault();
      links[0].focus();
    } else if (active === links[0] && event.shiftKey) {
      event.preventDefault();
      trigger.focus();
    } else if (active === links[links.length - 1] && !event.shiftKey) {
      // 既定の Tab 移動はフォーカス中の要素から次を探すため、閉じて「+N」へ戻してから既定動作に任せ、
      // 表の中で「+N」の次の要素へ進ませる
      this.dropdown.close(true);
    }
  }

  /** 行DOMは使い回されるため、行の index から現在表示中のレコードを引き直す。 */
  private lookupRecord(trigger: HTMLElement): ResultData | null {
    const index = Number(trigger.closest<HTMLTableRowElement>('tr')?.dataset.rowIndex);
    if (!Number.isInteger(index)) return null;
    const record = storeManager.getRecordByIndex(index);
    return record && typeof record !== 'string' ? record : null;
  }

  /** 行の index からレコードを引き直し、列に応じた一覧を作ってバッジの近くに出す。 */
  private open(trigger: HTMLElement): void {
    this.trigger = trigger;
    const td = trigger.closest<HTMLTableCellElement>('td');
    const record = this.lookupRecord(trigger);
    this.record = record;
    if (!td || !record) {
      this.list.replaceChildren();
      return;
    }

    const { items, more } = getRemainingItems(td, record);
    const rows: HTMLElement[] = items.map((item) =>
      createEl('li', { class: 'item', children: [createItemContent(item)] })
    );
    if (more > 0) {
      rows.push(createEl('li', { class: 'note', text: `and ${more.toLocaleString()} more` }));
    }
    this.list.replaceChildren(...rows);
    this.place(trigger);
  }

  /**
   * 基本はバッジの真下に出し、表の下端近くの行では上に開く。
   * 横は #ResultsView の右端からはみ出さないよう左へずらす。
   */
  private place(trigger: HTMLElement): void {
    const rootRect = this.root.getBoundingClientRect();
    const badgeRect = trigger.getBoundingClientRect();

    this.panel.style.left = '0px';
    const maxLeft = this.root.clientWidth - this.panel.offsetWidth;
    this.panel.style.left = `${Math.max(0, Math.min(badgeRect.left - rootRect.left, maxLeft))}px`;

    this.panel.style.top = `${badgeRect.bottom - rootRect.top + PANEL_GAP_PX}px`;
    fitResultsPanelHeight(this.panel);
    const naturalHeight = this.panel.scrollHeight;
    const roomBelow = this.panel.clientHeight;
    // ページが縦にスクロールしていると #ResultsView の上端が画面外にあるため、画面の上端でも切る
    const roomAbove = badgeRect.top - Math.max(rootRect.top, 0) - PANEL_GAP_PX;
    if (roomBelow >= Math.min(naturalHeight, MIN_PANEL_HEIGHT_PX) || roomAbove <= roomBelow) return;

    const height = Math.min(naturalHeight, roomAbove);
    this.panel.style.maxHeight = `${height}px`;
    this.panel.style.top = `${badgeRect.top - rootRect.top - PANEL_GAP_PX - height}px`;
  }
}

/** セルの表示と同じ規則で並べ、先頭（セルに見えている1件）を除いた残りを返す。 */
function getRemainingItems(
  td: HTMLTableCellElement,
  record: ResultData
): { items: PanelItem[]; more: number } {
  if (td.classList.contains('refsnp_id')) {
    return {
      items: (record.existing_variations ?? []).slice(1).map((id) => ({
        label: id,
        href: `https://identifiers.org/dbsnp/${id}`,
        external: true,
      })),
      more: 0,
    };
  }

  if (td.classList.contains('gene')) {
    // 巨大SVでは items が省略・一部だけになるため、total との差は件数だけ示す
    const summary = ResultsColumnUpdater.normalizeGeneSummary(record.genes);
    const symbols = summary.items.filter(Boolean);
    return {
      items: symbols.slice(1).map((gene) => ({ label: gene.name, href: `/gene/${gene.id}` })),
      more: Math.max(0, summary.total - Math.max(symbols.length, 1)),
    };
  }

  if (td.classList.contains('consequence')) {
    const master =
      (getSimpleSearchConditionMaster('consequence')?.items as ConsequenceMasterItem[] | undefined) ?? [];
    const ids = Array.from(
      new Set((record.transcripts ?? []).flatMap((transcript) => transcript.consequence ?? []))
    ).filter((id) => id !== record.most_severe_consequence);
    return {
      items: ids.map((id) => ({ label: master.find((item) => item.id === id)?.label || id })),
      more: 0,
    };
  }

  return { items: [], more: 0 };
}

/** リンク先がある値は表のセルと同じリンクにし、無い値（Consequence）は文字だけにする。 */
function createItemContent({ label, href, external }: PanelItem): HTMLElement {
  if (!href) return createEl('span', { class: 'text', text: label });
  return createEl('a', {
    class: `hyper-text ${external ? '-external' : '-internal'}`,
    attrs: {
      href,
      ...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
    },
    text: label,
  });
}
