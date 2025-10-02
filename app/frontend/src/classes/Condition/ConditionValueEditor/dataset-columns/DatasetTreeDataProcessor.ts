import type { HierarchyNode } from 'd3-hierarchy';
import { hierarchy } from 'd3-hierarchy';
import { CONDITION_TYPE } from '../../../../definition';
import { ADVANCED_CONDITIONS } from '../../../../global';
import type { TreeNode } from '../../../../types';
import type { UiNode } from './types';
import { ROOT_NODE_ID } from './types';

/**
 * Handles data conversion and preparation for dataset columns editor
 */
export class DatasetTreeDataProcessor {
  private _uniqueIdCounter = 0;

  /**
   * Adds unique IDs to data nodes recursively.
   * @param dataNodes - Array of data nodes to process
   * @returns Array of data nodes with unique IDs and checked properties
   */
  addUniqueIdsToNodes(dataNodes: readonly TreeNode[]): UiNode[] {
    return dataNodes.map((node) => {
      if (!Number.isInteger(this._uniqueIdCounter)) {
        this._uniqueIdCounter = 0;
      }

      const processedNode: UiNode = {
        label: node.label,
        value: 'value' in node ? node.value : undefined,
        id: `${this._uniqueIdCounter++}`,
        checked: false,
        indeterminate: false,
      };

      if (node.children && node.children.length > 0) {
        processedNode.children = this.addUniqueIdsToNodes(node.children);
      }

      return processedNode;
    });
  }

  /**
   * Prepares the hierarchical data structure based on condition type.
   * @returns Hierarchy node with processed data
   */
  prepareHierarchicalData(conditionType: string): HierarchyNode<UiNode> {
    switch (conditionType) {
      case CONDITION_TYPE.dataset:
      case CONDITION_TYPE.genotype: {
        const conditionDef = ADVANCED_CONDITIONS[conditionType];
        if (!conditionDef || !('values' in conditionDef)) {
          throw new Error('Invalid condition definition or no values property');
        }
        const rawData = (
          conditionDef as unknown as { values: readonly TreeNode[] }
        ).values;
        const processedData = this.addUniqueIdsToNodes(rawData);

        return hierarchy<UiNode>({
          id: ROOT_NODE_ID,
          label: 'root',
          value: '',
          children: processedData,
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

  /**
   * Resets all check states in the data hierarchy.
   */
  resetAllCheckStates(data: HierarchyNode<UiNode>): void {
    data.each((datum) => {
      datum.data.checked = false;
      datum.data.indeterminate = false;
    });
  }

  /**
   * Restores checked states from the last saved values.
   */
  restoreCheckedStates(
    data: HierarchyNode<UiNode>,
    lastValueViews: Array<{ dataset: { value?: string } }>,
    onUpdateChildrenCheckState: (
      node: HierarchyNode<UiNode>,
      checked: boolean
    ) => void,
    onUpdateParentCheckState: (
      node: HierarchyNode<UiNode>,
      checked: boolean
    ) => void
  ): void {
    for (const lastValue of lastValueViews) {
      const node = data.find(
        (d) => d.data.value === lastValue.dataset['value']
      );
      if (!node) continue;

      node.data.checked = true;
      onUpdateChildrenCheckState(node, true);
      onUpdateParentCheckState(node, true);
    }
  }
}
