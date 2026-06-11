import type { HierarchyNode } from 'd3-hierarchy';
import { hierarchy } from 'd3-hierarchy';
import { CONDITION_TYPE } from '../../../../definition';
import { ADVANCED_CONDITIONS } from '../../../../global';
import type { TreeNode } from '../../../../types';
import type { UiNode } from './types';
import { ROOT_NODE_ID } from './types';
import type { ConditionItemValueView } from '../../ConditionItemValueView';

/**
 * 検索条件マスタのデータをカラムUIが扱えるHierarchyNode形式に変換する。
 *
 * 変換時にノードへIDと選択状態を付与することで、DOMとデータモデルを
 * idを軸に紐付けられるようにする。
 */
export class DatasetTreeDataProcessor {
  private _uniqueIdCounter = 0;

  /**
   * rawノードにユニークIDと初期選択状態を付けてUiNode配列へ変換する。
   * DOMの checkbox と data-id 属性でノードを対応させるためにIDが必要。
   */
  private _addNodeIds(rawDataNodes: readonly TreeNode[]): UiNode[] {
    return rawDataNodes.map((rawNode) => {
      const uiReadyNode: UiNode = {
        label: rawNode.label,
        value: 'value' in rawNode ? rawNode.value : undefined,
        id: `node-${this._uniqueIdCounter++}`,
        checked: false,
        indeterminate: false,
      };

      if (rawNode.children && rawNode.children.length > 0) {
        uiReadyNode.children = this._addNodeIds(rawNode.children);
      }

      return uiReadyNode;
    });
  }

  /**
   * conditionTypeに対応したマスタデータをd3-hierarchyに変換して返す。
   *
   * 複数のルートカテゴリを単一ツリーとして扱うため仮想ルートで包む。
   * d3のtree traversal APIが単一エントリポイントを前提とするための措置。
   */
  prepareHierarchicalData(conditionType: string): HierarchyNode<UiNode> {
    switch (conditionType) {
      case CONDITION_TYPE.dataset:
      case CONDITION_TYPE.genotype: {
        const conditionDefinition = ADVANCED_CONDITIONS[conditionType];
        if (!conditionDefinition || !('values' in conditionDefinition)) {
          throw new Error(
            `Invalid condition definition for type '${conditionType}' or missing values property`
          );
        }

        const rawDatasetConfiguration = (
          conditionDefinition as unknown as { values: readonly TreeNode[] }
        ).values;
        const uiReadyDataNodes = this._addNodeIds(rawDatasetConfiguration);

        return hierarchy<UiNode>({
          id: ROOT_NODE_ID,
          label: 'root',
          value: '',
          children: uiReadyDataNodes,
          checked: false,
          indeterminate: false,
        });
      }
      default:
        throw new Error(
          'ConditionValueEditorDatasetColumns - Invalid condition type'
        );
    }
  }

  /** ツリー全体のchecked/indeterminate状態をリセットする。 */
  resetAllCheckStates(datasetTree: HierarchyNode<UiNode>): void {
    datasetTree.each((datasetNode) => {
      datasetNode.data.checked = false;
      datasetNode.data.indeterminate = false;
    });
  }

  /**
   * 保存済みの選択値をツリーへ復元する。
   * キャンセル時に編集前の状態へ戻すために使う。
   */
  restoreCheckedStates(
    datasetTree: HierarchyNode<UiNode>,
    savedSelections: ConditionItemValueView[],
    propagateToChildren: (
      node: HierarchyNode<UiNode>,
      isSelected: boolean
    ) => void,
    updateParentStates: (
      node: HierarchyNode<UiNode>,
      isSelected: boolean
    ) => void
  ): void {
    for (const savedSelection of savedSelections) {
      const nodeToRestore = datasetTree.find(
        (datasetNode) => datasetNode.data.value === savedSelection.value
      );
      if (!nodeToRestore) continue;

      nodeToRestore.data.checked = true;
      propagateToChildren(nodeToRestore, true);
      updateParentStates(nodeToRestore, true);
    }
  }
}
