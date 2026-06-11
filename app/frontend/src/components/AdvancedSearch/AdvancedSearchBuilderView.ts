import { setAdvancedSearchCondition } from '../../store/searchManager';
import { storeManager } from '../../store/StoreManager';
import { ConditionGroupView } from '../Condition/ConditionGroupView';
import { type ConditionView, isGroupView } from '../Condition/ConditionView';
import { AdvancedSearchToolbar } from './AdvancedSearchToolbar';
import { AdvancedSearchSelection } from './AdvancedSearchSelection';
import { CONDITION_NODE_KIND, type ConditionTypeValue } from '../../definition';
import { selectRequired } from '../../utils/dom/select';
import {
  getSelectionCapabilities,
  type SelectionCapabilities,
} from './AdvancedSearchSelectionCapabilities';
import { restoreAdvancedSearchCondition } from './AdvancedSearchConditionRestorer';

/**
 * 高度検索ビルダー全体を管理する View。
 *
 * - ルートの条件グループとツールバーを生成する
 * - 選択状態から実行可能な操作を判定し、ツールバーへ反映する
 * - 条件が変わったタイミングで検索条件を組み立て、ストアへ渡す
 */
export class AdvancedSearchBuilderView {
  private _advancedSearchBuilderEl: HTMLElement;
  private _container: HTMLElement;
  private _rootGroup: ConditionGroupView;
  private _toolbar: AdvancedSearchToolbar;
  private _selection: AdvancedSearchSelection;
  private readonly _onRestoredFromURL: (restored: boolean | undefined) => void;

  constructor(advancedSearchBuilderEl: HTMLElement) {
    this._advancedSearchBuilderEl = advancedSearchBuilderEl;

    this._container = selectRequired(
      advancedSearchBuilderEl,
      ':scope > .inner'
    );

    this._rootGroup = new ConditionGroupView(
      this,
      this._container,
      'and',
      [],
      null,
      true
    );

    this._toolbar = new AdvancedSearchToolbar(
      this,
      this._rootGroup.makeToolbar()
    );
    this._selection = new AdvancedSearchSelection(this);
    this.onSelectionChange([]);

    // void でラップしてPromiseを意図的に無視する。
    // 復元エラーはRestorer内部でハンドリングされ、UIは初期状態のまま表示される。
    void this._restoreConditionFromStore();

    // popstate時にhandleHistoryChangeがストアを更新したことを検知してViewを再構築する。
    // 初回ロード時はinitializeApp()で復元するため、ここではtrue時のみ処理する。
    // コールバック参照をフィールドに保持し、destroy()でunsubscribeできるようにする。
    this._onRestoredFromURL = (restored) => {
      if (restored) {
        this._rootGroup.clearConditionViews();
        void this._restoreConditionFromStore();
      }
    };
    storeManager.subscribe(
      'advancedSearchRestoredFromURL',
      this._onRestoredFromURL
    );
  }

  /** 旧実装との互換用。既存の呼び出し元が残っている可能性がある。 */
  selectedConditionViews(selection: ConditionView[]): void {
    this.onSelectionChange(selection);
  }

  /** 選択状態が変わったときに、実行可能な操作を UI へ反映する。 */
  onSelectionChange(selection: ConditionView[]): void {
    const caps = getSelectionCapabilities(selection);
    this._applyCapabilitiesToDataset(caps);
  }

  private _setFlag(
    name: 'canDelete' | 'canGroup' | 'canUngroup' | 'canCopy',
    value: boolean
  ) {
    this._advancedSearchBuilderEl.dataset[name] = String(value);
  }

  /**
   * 操作可否を data-* 属性とツールバーの disabled 状態へ反映する。
   * data-* 属性はCSSセレクターから参照されるため、ToolbarだけでなくDOM側にも書き込む。
   */
  private _applyCapabilitiesToDataset(caps: SelectionCapabilities): void {
    this._setFlag('canDelete', caps.canDelete);
    this._setFlag('canGroup', caps.canGroup);
    this._setFlag('canUngroup', caps.canUngroup);
    this._setFlag('canCopy', caps.canCopy);
    this._toolbar.setCommandStates({
      delete: caps.canDelete,
      group: caps.canGroup,
      ungroup: caps.canUngroup,
    });
  }

  /** 条件が変わったことを通知し、検索条件を再送信する。 */
  changeCondition(): void {
    this._submitAdvancedSearchCondition();
  }

  /** 選択中の条件を、同じ親の配下に作る新しいグループへまとめる。 */
  group(): void {
    const selected = this._selection.getSelectedConditionViews();
    if (selected.length === 0)
      throw new Error('No condition views selected to group.');

    const parents = new Set(selected.map((v) => v.parentGroup).filter(Boolean));
    if (parents.size !== 1) return;
    const parent = parents.values().next().value!;

    const siblingViews = parent.childViews;
    let insertionEl: HTMLElement | null = null;
    let minIndex = Infinity;
    for (const view of selected) {
      const idx = siblingViews.indexOf(view);
      if (idx >= 0 && idx < minIndex) {
        minIndex = idx;
        // 新しいグループを先頭の選択条件の直前に挿入することで、元の表示順を保持する。
        insertionEl = view.rootEl;
      }
    }

    const newGroup = parent.addNewConditionGroup(selected, insertionEl);
    this._selection.selectConditionView(newGroup, true);
    this.changeCondition();
  }

  /** 選択中のグループを解除する。対象がグループでない場合は何もしない。 */
  ungroup(): void {
    const selected = this._selection.getSelectedConditionViews();
    if (selected.length === 0) return;

    selected.forEach((view) => this._selection.deselectConditionView(view));

    const first = selected[0];
    if (isGroupView(first)) {
      first.ungroup();
      this.changeCondition();
    }
  }

  /** 指定された条件、または現在選択中の条件を削除する。 */
  deleteCondition(views?: ConditionView[]): void {
    const list = views ?? this._selection.getSelectedConditionViews();
    if (list.length === 0) return;

    for (const view of list) {
      view.remove();
      this._selection.deselectConditionView(view);
    }
    this.changeCondition();
  }

  /** ルートグループから検索条件を組み立て、ストアへ渡す。 */
  private _submitAdvancedSearchCondition(): void {
    const query = this._rootGroup.queryFragment;
    setAdvancedSearchCondition(query);
  }

  /** URLなどからストアへ復元済みの条件を、Builderの表示へ反映する。 */
  private async _restoreConditionFromStore(): Promise<void> {
    const query = storeManager.getData('advancedSearchConditions');
    if (!query || typeof query !== 'object' || Object.keys(query).length === 0)
      return;

    await restoreAdvancedSearchCondition(this._rootGroup, query);
    this.onSelectionChange([]);
  }

  /**
   * 選択中の場所へ新しい条件を追加する。
   *
   * 条件が選択されている場合はその直後へ、グループが選択されている場合は
   * そのグループの末尾へ追加する。未選択ならルートグループへ追加する。
   *
   * @param options 初期値。例: karyotype 選択から渡される { chr, start, end }
   */
  addCondition(conditionType: ConditionTypeValue, options?: unknown): void {
    const selected = this._selection.getSelectedConditionViews();
    const target = selected.length > 0 ? selected[0] : this._rootGroup;

    this._selection.deselectAllConditions();

    if (target.conditionNodeKind === CONDITION_NODE_KIND.condition) {
      target.parentGroup?.addNewConditionItem(
        conditionType,
        target.rootEl.nextSibling,
        options
      );
    } else if (
      target.conditionNodeKind === CONDITION_NODE_KIND.group &&
      isGroupView(target)
    ) {
      target.addNewConditionItem(conditionType, null, options);
    }
  }

  get container(): HTMLElement {
    return this._container;
  }
  get selection(): AdvancedSearchSelection {
    return this._selection;
  }

  destroy(options?: { clearDom?: boolean }): void {
    storeManager.unsubscribe(
      'advancedSearchRestoredFromURL',
      this._onRestoredFromURL
    );
    this._toolbar?.destroy({ clearDom: options?.clearDom });
    this._rootGroup?.remove();
  }
}
