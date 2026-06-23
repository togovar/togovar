import { CONDITION_NODE_KIND } from '../../advancedCondition';
import type { ConditionView, GroupView } from '../Condition/ConditionView';

export type SelectionCapabilities = Readonly<{
  canDelete: boolean;
  canGroup: boolean;
  canUngroup: boolean;
  canCopy: boolean;
}>;

const DISABLED_CAPABILITIES: SelectionCapabilities = {
  canDelete: false,
  canGroup: false,
  canUngroup: false,
  canCopy: false,
};

/**
 * 現在の選択状態から、ツールバーで実行できる操作を判定する。
 *
 * DOM や Builder の状態を変更しない純粋な判定にしておくことで、
 * AdvancedSearchBuilderView は「判定結果を UI に反映する」役割に集中できる。
 */
export function getSelectionCapabilities(
  selection: ReadonlyArray<ConditionView>
): SelectionCapabilities {
  if (selection.length === 0) return DISABLED_CAPABILITIES;

  const selectedParentGroups = new Set(
    selection
      .map((view) => view.parentGroup)
      .filter((group): group is GroupView => group !== null)
  );
  const isSingleSelection = selection.length === 1;
  const firstSelected = selection[0];

  return {
    // 選択が1件でもあれば削除できる。削除可否の細かい制御は各Viewのremove側へ寄せる。
    canDelete: true,
    canGroup: canGroupSelectedViews(selection, selectedParentGroups),
    // グループ解除は単一選択だけに限定する。複数グループ同時解除は順序と親の扱いが複雑になる。
    canUngroup:
      isSingleSelection &&
      (firstSelected.canUngroup === true ||
        firstSelected.conditionNodeKind === CONDITION_NODE_KIND.group),
    // copyは現状ツールバー未実装だが、将来のために単一条件だけ許可する判定を維持している。
    canCopy:
      isSingleSelection &&
      (firstSelected.canCopy === true ||
        firstSelected.conditionNodeKind === CONDITION_NODE_KIND.condition),
  };
}

function canGroupSelectedViews(
  selection: ReadonlyArray<ConditionView>,
  selectedParentGroups: ReadonlySet<GroupView>
): boolean {
  // 異なる親の条件をまとめるとDOM移動とquery構造が崩れやすいため、同じ親の兄弟だけを対象にする。
  if (selection.length <= 1 || selectedParentGroups.size !== 1) return false;

  const parentGroup = selectedParentGroups.values().next().value!;
  // 全兄弟を選択している場合、新しいグループで包んでも構造上の意味が変わらないため許可しない。
  return selection.length < parentGroup.childViews.length;
}
