import TopPageLayoutManager from './TopPageLayoutManager';

type CollapseTarget = {
  ancestors: HTMLTableRowElement[];
  tr: HTMLTableRowElement;
};

export default class CollapseView {
  private readonly _collapseView: HTMLElement;
  private readonly _collapseButton: HTMLElement | null;
  private readonly _collapseTargets: CollapseTarget[];
  private readonly _collapseId: string | undefined;

  /**
   * collapse-view単位で開閉状態と配下行の表示制御を閉じ込めるため、DOM参照を初期化時に確定する。
   */
  constructor(collapseView: HTMLElement) {
    this._collapseView = collapseView;
    this._collapseButton =
      collapseView.querySelector<HTMLElement>('.collapsebutton');
    this._collapseId = collapseView.dataset.collapseId;
    this._collapseTargets = this._collectCollapseTargets();

    this._setup();
  }

  /**
   * 終端ノードやボタンなしノードでは開閉操作が不要なため、イベント登録を省略する。
   */
  private _setup(): void {
    if (
      this._collapseView.classList.contains('-terminal') ||
      !this._collapseButton
    ) {
      return;
    }

    this._collapseButton.addEventListener('click', () => {
      this._toggle();
    });

    this._restoreInitialStatus();
  }

  /**
   * 開閉状態のDOM反映、保存、レイアウト再計算を1つの操作として扱う。
   */
  private _toggle(): void {
    this._collapseView.classList.toggle('-collapsed');

    if (this._collapseView.classList.contains('-unstructured')) {
      this._updateUnstructuredTargets();
    }

    this._storeStatus();

    if (this._collapseView.dataset.collapseId === 'advanced-search') {
      TopPageLayoutManager.scheduleUpdate();
    }
  }

  /**
   * table行で階層表現するunstructured表示では、親の開閉状態に応じて子孫行を直接隠す。
   */
  private _updateUnstructuredTargets(): void {
    this._collapseTargets.forEach((target) => {
      const isParentCollapsed = target.ancestors.some((tr) =>
        tr.querySelector('.collapse-view')?.classList.contains('-collapsed')
      );
      target.tr.style.display = isParentCollapsed ? 'none' : 'table-row';
    });
  }

  /**
   * collapse-idがあるViewだけ状態を保存し、idなしの一時的な開閉UIをlocalStorageへ混ぜない。
   */
  private _storeStatus(): void {
    if (!this._collapseId) return;

    window.localStorage.setItem(
      this._collapseId,
      this._collapseView.classList.contains('-collapsed') ? 'collapsed' : ''
    );
  }

  /**
   * 保存済み状態を通常のclick処理に通すことで、初期表示でも子孫行とレイアウト更新を同じ経路にする。
   */
  private _restoreInitialStatus(): void {
    if (
      this._collapseId &&
      window.localStorage.getItem(this._collapseId) === 'collapsed'
    ) {
      this._collapseButton?.dispatchEvent(new Event('click'));
    }
  }

  /**
   * unstructured以外では子孫行の個別制御が不要なため、対象リストを空のままにする。
   */
  private _collectCollapseTargets(): CollapseTarget[] {
    if (!this._collapseView.classList.contains('-unstructured')) {
      return [];
    }

    const depth = this._getCollapseDepth(this._collapseView);
    const parentRow = this._findParentRow(this._collapseView);
    if (depth === null || !parentRow) {
      return [];
    }

    const ancestors: HTMLTableRowElement[] = [];
    const targets: CollapseTarget[] = [];
    ancestors[depth] = parentRow;

    let nextRow = parentRow.nextElementSibling;
    while (nextRow instanceof HTMLTableRowElement) {
      const target = nextRow.querySelector<HTMLElement>(
        '.collapse-view[data-collapse-depth]'
      );
      const targetDepth = target ? this._getCollapseDepth(target) : null;

      if (targetDepth === null || targetDepth <= depth) {
        break;
      }

      ancestors[targetDepth] = nextRow;
      targets.push({
        ancestors: ancestors.slice(depth, targetDepth),
        tr: nextRow,
      });
      nextRow = nextRow.nextElementSibling;
    }

    return targets;
  }

  /**
   * data属性は文字列なので、階層比較に使える数値だけを有効なdepthとして扱う。
   */
  private _getCollapseDepth(elm: Element): number | null {
    const rawDepth =
      elm instanceof HTMLElement ? elm.dataset.collapseDepth : '';
    if (!rawDepth) return null;

    const depth = Number.parseInt(rawDepth, 10);
    return Number.isNaN(depth) ? null : depth;
  }

  /**
   * unstructured表示はtable行単位で表示制御するため、現在のcollapse-viewを含む親TRを探す。
   */
  private _findParentRow(elm: Element): HTMLTableRowElement | null {
    let parent: Node | null = elm.parentNode;

    while (parent) {
      if (parent instanceof HTMLTableRowElement) {
        return parent;
      }
      parent = parent.parentNode;
    }

    return null;
  }
}
