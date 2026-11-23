import { HoverDropdown } from '../HoverDropdown';
import { storeManager } from '../../store/StoreManager';
import { getSimpleSearchConditionMaster } from '../../store/search/searchManager';
import { createEl } from '../../utils/dom/createEl';
import { fitResultsPanelHeight } from './fitResultsPanelHeight';
import {
  ResultsColumnUpdater,
  getDbsnpUrl,
  getGeneReportPath,
  getOtherConsequenceIds,
} from './ResultsColumnUpdater';
import { REMAINS_PANEL_ID } from './ResultsColumnTemplates';
import type { ConsequenceMasterItem, ResultData } from '../../types';

// レポートリンク行の「+N」（.remains-badge.more）と区別するため、表の行内のバッジだけを対象にする
const TRIGGER_SELECTOR = '.tablecontainer > table > tbody > tr > td .remains-badge';
// 下に十分な高さが無いときは上に開く。数件は見える高さを基準にする
const MIN_PANEL_HEIGHT_PX = 120;
const PANEL_GAP_PX = 2;

type PanelItem = { label: string; href?: string; external?: boolean };

// 「+N」を持つ列。td のクラス名（ResultsColumnTemplates）と同じ値にする
const REMAINS_COLUMNS = ['refsnp_id', 'gene', 'consequence'] as const;
type RemainsColumn = (typeof REMAINS_COLUMNS)[number];

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
  // 再描画で作り直されたバッジを探し直すため、開いている列を覚えておく
  private column: RemainsColumn | null = null;
  // 再描画でフォーカス中のバッジが外れると activeElement が body に落ちるため、直前にフォーカスがあったかを覚えておく
  private triggerFocused = false;

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

  /**
   * searchResults の通知後や表示サイズの変化で、行は次のフレームに tr.innerHTML ごと作り直される。
   * 開いていたバッジが DOM から外れたままだと Esc / Tab のフォーカス移動が効かないため、
   * 同じ行・同じ列の新しいバッジへ付け替え、見つからなければ閉じる。
   */
  private readonly onResultsRendered = () => {
    const trigger = this.trigger;
    if (!trigger || trigger.isConnected) return;

    const next = this.findReplacementTrigger(trigger);
    if (!next) {
      this.dropdown.close();
      return;
    }
    this.dropdown.replaceTrigger(next);
    this.trigger = next;
    this.place(next);
    const active = document.activeElement;
    if (this.triggerFocused && (!active || active === document.body)) next.focus();
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
        this.column = null;
        this.triggerFocused = false;
        this.list.replaceChildren();
      },
    });
    const { signal } = this.events;
    // 横スクロールでは offset が変わらず、パネルだけ元の位置に残ってしまうため閉じる
    root
      .querySelector<HTMLElement>('.tablecontainer')
      ?.addEventListener('scroll', this.onTableChange, { passive: true, signal });
    root.addEventListener('keydown', (event) => this.handleTab(event), { signal });
    // 列幅ドラッグ中は Store の columns を通さずプレビューするため、掴んだ時点で閉じる。
    // ResultsColumnResizeController が thead / tbody で伝播を止めるので、capture で先に受け取る
    root.addEventListener(
      'pointerdown',
      (event) => {
        if (event.target instanceof Element && event.target.closest('.resize-bar')) {
          this.dropdown.close();
        }
      },
      { capture: true, signal }
    );
    // 要素が外れても focusin は他で起きないため、最後にフォーカスを受けたのがバッジかどうかで判定できる
    document.addEventListener(
      'focusin',
      (event) => {
        this.triggerFocused = this.trigger !== null && event.target === this.trigger;
      },
      { signal }
    );
    window.addEventListener('togovar:results-rendered', this.onResultsRendered, { signal });
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

  /**
   * 行DOMは index ごとに使い回されるため、同じ data-row-index の行の同じ列から新しいバッジを探す。
   * 行の中身が別のレコードに変わっていたり、件数が無くなっていたりしたら、付け替えずに閉じさせる。
   */
  private findReplacementTrigger(trigger: HTMLElement): HTMLElement | null {
    const rowIndex = trigger.closest<HTMLTableRowElement>('tr')?.dataset.rowIndex;
    if (rowIndex === undefined || !this.column) return null;
    const next = this.root.querySelector<HTMLElement>(
      `.tablecontainer > table > tbody > tr[data-row-index="${rowIndex}"] > td.${this.column} .remains-badge`
    );
    if (!next || !next.textContent) return null;
    return this.lookupRecord(next) === this.record ? next : null;
  }

  /** 行の index からレコードを引き直し、列に応じた一覧を作ってバッジの近くに出す。 */
  private open(trigger: HTMLElement): void {
    this.trigger = trigger;
    // focusin より先に開く経路（hover・クリック）もあるため、開いた時点のフォーカスも見ておく
    this.triggerFocused = document.activeElement === trigger;
    const td = trigger.closest<HTMLTableCellElement>('td');
    const record = this.lookupRecord(trigger);
    this.record = record;
    this.column = td ? getRemainsColumn(td) : null;
    const rows: HTMLElement[] = [];
    if (td && record && this.column) {
      const { items, more } = getRemainingItems(this.column, record);
      rows.push(
        ...items.map((item) =>
          createEl('li', { class: 'item', children: [createItemContent(item)] })
        )
      );
      if (more > 0) {
        rows.push(createEl('li', { class: 'note', text: `and ${more.toLocaleString()} more` }));
      }
    }
    // 取得中の行やデータの食い違いで出す値が無いとき、影と余白だけの空の箱が見えないよう開かずに閉じる
    if (rows.length === 0) {
      this.dropdown.close();
      return;
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

/** 再描画後に同じ列のバッジを探し直せるよう、td のクラス名から「+N」を持つ列を判定する。 */
function getRemainsColumn(td: HTMLTableCellElement): RemainsColumn | null {
  return REMAINS_COLUMNS.find((column) => td.classList.contains(column)) ?? null;
}

/** セルの表示と同じ規則で並べ、先頭（セルに見えている1件）を除いた残りを返す。 */
function getRemainingItems(
  column: RemainsColumn,
  record: ResultData
): { items: PanelItem[]; more: number } {
  if (column === 'refsnp_id') {
    return {
      items: (record.existing_variations ?? []).slice(1).map((id) => ({
        label: id,
        href: getDbsnpUrl(id),
        external: true,
      })),
      more: 0,
    };
  }

  if (column === 'gene') {
    // 巨大SVでは items が省略・一部だけになるため、total との差は件数だけ示す
    const summary = ResultsColumnUpdater.normalizeGeneSummary(record.genes);
    const symbols = summary.items.filter(Boolean);
    return {
      items: symbols.slice(1).map((gene) => ({ label: gene.name, href: getGeneReportPath(gene.id) })),
      more: Math.max(0, summary.total - Math.max(symbols.length, 1)),
    };
  }

  const master =
    (getSimpleSearchConditionMaster('consequence')?.items as ConsequenceMasterItem[] | undefined) ?? [];
  const ids = getOtherConsequenceIds(record.most_severe_consequence, record.transcripts ?? []);
  return {
    items: ids.map((id) => ({ label: master.find((item) => item.id === id)?.label || id })),
    more: 0,
  };
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
