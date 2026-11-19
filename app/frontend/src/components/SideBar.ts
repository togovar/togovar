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
const COLLAPSED_STORAGE_KEY = 'sidebar_collapsed';

type SelectedRowIndex = StoreState['selectedRow'];

export default class SideBar {
  private readonly _elm: HTMLElement;
  private readonly _body: HTMLElement;
  private readonly _previews: HTMLElement;
  private readonly _toggleButtons: HTMLButtonElement[];

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
    const rail = selectRequired<HTMLButtonElement>(
      container,
      SELECTORS.rail,
      'SideBar'
    );
    const closeButtons = Array.from(
      this._elm.querySelectorAll<HTMLButtonElement>(SELECTORS.closeButtons)
    );
    this._toggleButtons = [rail, ...closeButtons];

    // 初回の selectedRow 反映で自動展開が走る前に、保存済みの開閉状態を復元しておく。
    this._setupCollapse(rail, closeButtons);

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
  private _setupCollapse(
    rail: HTMLButtonElement,
    closeButtons: HTMLButtonElement[]
  ): void {
    const stored = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
    this._applyCollapsed(stored === 'true');

    rail.addEventListener('click', () => this.setCollapsed(false));
    closeButtons.forEach((button) => {
      button.addEventListener('click', () => this.setCollapsed(true));
    });
  }

  /**
   * 利用者操作による開閉は次回表示でも維持したいので、状態反映と同時に保存する。
   */
  setCollapsed(collapsed: boolean): void {
    this._applyCollapsed(collapsed);
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(collapsed));
  }

  /**
   * 開閉状態はCSS（幅・表示切替）とa11y属性の両方に効くため、bodyクラス・aria・inertを1か所で同期する。
   * 閉じている間の #SideBar は inert にして、見えないフィルタへTabフォーカスが入らないようにする。
   */
  private _applyCollapsed(collapsed: boolean): void {
    this._body.classList.toggle(COLLAPSED_CLASS, collapsed);
    this._elm.inert = collapsed;
    this._toggleButtons.forEach((button) => {
      button.setAttribute('aria-expanded', String(!collapsed));
    });
  }

  /**
   * 折りたたみ状態かどうかはbodyクラスを正とし、別途フラグを持って状態がずれるのを防ぐ。
   */
  private get _isCollapsed(): boolean {
    return this._body.classList.contains(COLLAPSED_CLASS);
  }

  /**
   * selectedRowはCSSだけでは参照できないStore状態なので、bodyの状態クラスへ橋渡しする。
   * 行間を移動するたびに scrollTop をリセットすると Up/Down キー操作でぴょこぴょこ動くため、
   * 「行なし → 行あり」（初回選択）のときのみプレビューを先頭に戻す。
   * 行クリックはプレビューを見たい意思表示なので、折りたたみ中でも初回選択時だけ自動で開く。
   */
  selectedRow(index: SelectedRowIndex): void {
    const hasSelectedRow = index !== undefined;
    const wasSelected = this._body.classList.contains('-rowselected');
    if (hasSelectedRow && !wasSelected) {
      this._previews.scrollTop = 0;
      if (this._isCollapsed) this.setCollapsed(false);
    }
    this._body.classList.toggle('-rowselected', hasSelectedRow);
  }
}
