import { CONDITION_NODE_KIND } from '../definition';
import type { ConditionView, GroupView } from './Condition/ConditionView';

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
    canDelete: true,
    canGroup: canGroupSelectedViews(selection, selectedParentGroups),
    canUngroup:
      isSingleSelection &&
      (firstSelected.canUngroup === true ||
        firstSelected.conditionNodeKind === CONDITION_NODE_KIND.group),
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
  if (selection.length <= 1 || selectedParentGroups.size !== 1) return false;

  const parentGroup = selectedParentGroups.values().next().value!;
  return selection.length < parentGroup.childViews.length;
}
