import { storeManager } from '../store/StoreManager';
import { resetSimpleSearchConditions } from '../store/search/searchManager';
import type { StoreState } from '../types/storeState';
import { selectRequired } from '../utils/dom/select';

const SELECTORS = {
  previews: '#Previews',
  resetButton: '#Filters > .title > .button-view',
  rail: '.sidebar-rail',
  closeButtons: '.sidebar-close',
} as const;

const COLLAPSED_CLASS = '-sidebar-collapsed';
// index.pug のインラインスクリプトが描画前に同じキーを読むため、変更時は両方を揃える。
const COLLAPSED_STORAGE_KEY = 'sidebar_collapsed';

type SelectedRowIndex = StoreState['selectedRow'];

/** Cookie禁止などで localStorage が使えない環境でもサイドバーを動かすため、読み込み失敗は「開いた状態」として扱う。 */
function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** 保存は「次回も同じ状態にする」ための補助なので、失敗しても開閉操作自体は止めない。 */
function writeCollapsed(collapsed: boolean): void {
  try {
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(collapsed));
  } catch {
    // 保存できない環境では、今回の表示中だけ状態を保つ。
  }
}

export default class SideBar {
  private readonly _elm: HTMLElement;
  private readonly _body: HTMLElement;
  private readonly _previews: HTMLElement;
  private readonly _rail: HTMLButtonElement;
  private readonly _closeButtons: HTMLButtonElement[];

  /**
   * selectedRowの変化を受け取るためStoreに購読登録し、初期値を即時反映する。
   */
  constructor(elm: HTMLElement) {
    this._elm = elm;
    this._body = document.body;
    this._previews = selectRequired<HTMLElement>(
      this._elm,
      SELECTORS.previews,
      'SideBar'
    );

    // レールは #SideBar の外（.LayoutAside 直下）に置いているため親要素から探す。
    const container = this._elm.parentElement ?? document;
    this._rail = selectRequired<HTMLButtonElement>(
      container,
      SELECTORS.rail,
      'SideBar'
    );
    this._closeButtons = Array.from(
      this._elm.querySelectorAll<HTMLButtonElement>(SELECTORS.closeButtons)
    );

    // 開閉ボタンの aria-expanded を初期表示から正しくするため、保存済みの開閉状態を先に復元する。
    this._setupCollapse();

    storeManager.subscribe('selectedRow', (v) => this.selectedRow(v));
    this.selectedRow(storeManager.getData('selectedRow'));

    requestAnimationFrame(() => {
      this._body.classList.add('-sidebar-ready');
    });

    this._setupResetButton();
  }

  /**
   * Clear allはsimple search専用だが、SideBar内のDOM責務としてここでイベントを閉じ込める。
   */
  private _setupResetButton(): void {
    const resetButton = selectRequired<HTMLButtonElement>(
      this._elm,
      SELECTORS.resetButton,
      'SideBar'
    );
    resetButton.addEventListener('click', () => {
      resetSimpleSearchConditions();
    });
  }

  /**
   * 結果テーブルを広く使いたい利用者の選択をリロード後も保つため、localStorageから開閉状態を復元する。
   */
  private _setupCollapse(): void {
    this._applyCollapsed(readCollapsed());

    this._rail.addEventListener('click', () => this.setCollapsed(false));
    this._closeButtons.forEach((button) => {
      button.addEventListener('click', () => this.setCollapsed(true));
    });
  }

  /**
   * 利用者操作による開閉は次回表示でも維持したいので、状態反映と同時に保存する。
   * 押したボタン自体が隠れる（inert / display: none）ため、フォーカスを反対側のボタンへ移して見失わないようにする。
   */
  setCollapsed(collapsed: boolean): void {
    this._applyCollapsed(collapsed);
    writeCollapsed(collapsed);

    const next = collapsed ? this._rail : this._visibleCloseButton();
    // パネルを下へスクロールしていた場合に、見出しのボタンまで勝手に戻さないようにする。
    next?.focus({ preventScroll: true });
  }

  /**
   * #SideBar は Preview と Filters を横に並べてスライド表示しているため、いま見えている面の Close を選ぶ。
   */
  private _visibleCloseButton(): HTMLButtonElement | undefined {
    const showsPreview = this._body.classList.contains('-rowselected');
    return this._closeButtons.find(
      (button) => this._previews.contains(button) === showsPreview
    );
  }

  /**
   * 開閉状態はCSS（幅・表示切替）とa11y属性の両方に効くため、bodyクラス・aria・inertを1か所で同期する。
   * CSSの visibility: hidden でもフォーカスは外れるが、スタイル未適用時でも見えないフィルタへTabで入らないよう inert も付ける。
   */
  private _applyCollapsed(collapsed: boolean): void {
    this._body.classList.toggle(COLLAPSED_CLASS, collapsed);
    this._elm.inert = collapsed;
    [this._rail, ...this._closeButtons].forEach((button) => {
      button.setAttribute('aria-expanded', String(!collapsed));
    });
  }

  /**
   * selectedRowはCSSだけでは参照できないStore状態なので、bodyの状態クラスへ橋渡しする。
   * 行間を移動するたびに scrollTop をリセットすると Up/Down キー操作でぴょこぴょこ動くため、
   * 「行なし → 行あり」（初回選択）のときのみプレビューを先頭に戻す。
   * 折りたたみは利用者の明示的な操作なので、行選択では自動で開かない（レールのラベルだけ Preview に切り替わる）。
   * 閉じたときの面によって行クリックの結果が変わると分かりにくいため、開閉はレールと Close だけで行う。
   */
  selectedRow(index: SelectedRowIndex): void {
    const hasSelectedRow = index !== undefined;
    const wasSelected = this._body.classList.contains('-rowselected');
    if (hasSelectedRow && !wasSelected) {
      this._previews.scrollTop = 0;
    }
    this._body.classList.toggle('-rowselected', hasSelectedRow);
  }
}
