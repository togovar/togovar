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
   * selectedRowはCSSだけでは参照できないStore状態なので、bodyの状態クラスへ橋渡しする。
   */
  selectedRow(index: SelectedRowIndex): void {
    const hasSelectedRow = index !== undefined;
    if (hasSelectedRow) {
      this._previews.scrollTop = 0;
    }
    this._body.classList.toggle('-rowselected', hasSelectedRow);
  }
}
