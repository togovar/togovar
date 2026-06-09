import { storeManager } from '../store/StoreManager';
import { resetSimpleSearchConditions } from '../store/searchManager';
import type { StoreState } from '../types';
import { selectRequired } from '../utils/dom/select';

const SELECTORS = {
  previews: '#Previews',
  resetButton: '#Filters > .title > .button-view',
} as const;

type SelectedRowIndex = StoreState['selectedRow'];

export default class SideBar {
  private readonly _elm: HTMLElement;
  private readonly _body: HTMLElement;
  private readonly _previews: HTMLElement;

  /**
   * StoreManagerの旧bind APIから呼ばれるViewとして、必要なDOM参照を初期化時に確定する。
   */
  constructor(elm: HTMLElement) {
    this._elm = elm;
    this._body = document.body;
    this._previews = selectRequired<HTMLElement>(
      this._elm,
      SELECTORS.previews,
      'SideBar'
    );

    storeManager.bind('selectedRow', this);
    this.selectedRow(storeManager.getData<SelectedRowIndex>('selectedRow'));

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
   * selectedRowの有無がFilters/Previewの表示状態そのものなので、bind APIの受け口として残す。
   */
  selectedRow(index: SelectedRowIndex): void {
    if (index === undefined) {
      this._showFilters();
    } else {
      this._showPreviews();
    }
  }

  /**
   * 一覧へ戻るときはFilters側のスクロール位置を維持したいので、状態クラスだけ戻す。
   */
  private _showFilters(): void {
    this._body.classList.remove('-rowselected');
  }

  /**
   * Previewは選択行ごとの詳細確認なので、前回のスクロール位置を引き継がず先頭から見せる。
   */
  private _showPreviews(): void {
    this._previews.scrollTop = 0;
    this._body.classList.add('-rowselected');
  }
}
