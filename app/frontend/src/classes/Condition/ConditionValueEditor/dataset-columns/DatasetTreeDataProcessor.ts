import type { HierarchyNode } from 'd3-hierarchy';
import { hierarchy } from 'd3-hierarchy';
import { CONDITION_TYPE } from '../../../../definition';
import { ADVANCED_CONDITIONS } from '../../../../global';
import type { TreeNode } from '../../../../types';
import type { UiNode } from './types';
import { ROOT_NODE_ID } from './types';

/**
 * Transforms raw dataset configuration data into hierarchical structures for the column interface.
 *
 * This class is responsible for the complex data preparation required by the dataset
 * selection interface:
 * - Converts flat configuration objects into d3-hierarchy tree structures
 * - Assigns unique identifiers to each node for DOM manipulation and event handling
 * - Initializes selection state properties (checked, indeterminate) on all nodes
 * - Provides utilities for resetting and restoring selection states during user interactions
 *
 * The processed data structure enables efficient parent-child relationship management
 * and supports the column-based navigation paradigm.
 */
export class DatasetTreeDataProcessor {
  private _uniqueIdCounter = 0;

  /**
   * Recursively transforms raw tree nodes into UI-ready nodes with unique identifiers.
   *
   * This method performs several critical transformations:
   * - Assigns a unique ID to each node for DOM element association
   * - Initializes selection state properties (checked: false, indeterminate: false)
   * - Preserves the original hierarchical structure while adding UI metadata
   * - Recursively processes all child nodes to maintain tree integrity
   *
   * @param rawDataNodes - Array of raw tree nodes from configuration files
   * @returns Array of UI-ready nodes with unique IDs and initialized selection states
   */
  private _addNodeIds(rawDataNodes: readonly TreeNode[]): UiNode[] {
    return rawDataNodes.map((rawNode) => {
      // Ensure ID counter is valid (reset if corrupted)
      if (!Number.isInteger(this._uniqueIdCounter)) {
        this._uniqueIdCounter = 0;
      }

      const uiReadyNode: UiNode = {
        label: rawNode.label,
        value: 'value' in rawNode ? rawNode.value : undefined,
        id: `node-${this._uniqueIdCounter++}`, // More descriptive ID format
        checked: false, // Initially no items are selected
        indeterminate: false, // Initially no items are in mixed state
      };

      // Recursively process children if they exist
      if (rawNode.children && rawNode.children.length > 0) {
        uiReadyNode.children = this._addNodeIds(rawNode.children);
      }

      return uiReadyNode;
    });
  }

  /**
   * Creates a complete hierarchical data structure ready for use by the column interface.
   *
   * This is the main entry point for data preparation. It:
   * 1. Loads the appropriate raw dataset configuration based on condition type
   * 2. Transforms all nodes to include unique IDs and selection state properties
   * 3. Wraps the data in a d3-hierarchy structure for efficient tree operations
   * 4. Creates a synthetic root node to unify the tree structure
   *
   * @param conditionType - The type of condition (dataset, genotype, etc.)
   * @returns Complete d3-hierarchy tree ready for use by the column interface
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

        // Create a d3-hierarchy with synthetic root node for unified tree operations
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

  /**
   * Clears all selection states throughout the entire dataset hierarchy.
   *
   * This method traverses every node in the tree and resets both the 'checked'
   * and 'indeterminate' properties to false. It's typically used when the user
   * cancels their changes or when initializing the interface to a clean state.
   *
   * @param datasetTree - The root of the hierarchical dataset tree to reset
   */
  resetAllCheckStates(datasetTree: HierarchyNode<UiNode>): void {
    datasetTree.each((datasetNode) => {
      datasetNode.data.checked = false; // Clear all selections
      datasetNode.data.indeterminate = false; // Clear all mixed states
    });
  }

  /**
   * Restores the selection state from a previously saved snapshot.
   *
   * This method is used when the user clicks 'Cancel' to abandon their changes
   * and return to the last saved state. It:
   * 1. Finds each previously selected dataset in the current tree
   * 2. Marks it as selected
   * 3. Propagates the selection to children (ensures consistency)
   * 4. Updates parent states based on the restored selections
   *
   * @param datasetTree - The root of the hierarchical dataset tree
   * @param savedSelections - Array of previously selected dataset values
   * @param propagateToChildren - Callback to update child nodes when parent is restored
   * @param updateParentStates - Callback to recalculate parent states after restoration
   */
  restoreCheckedStates(
    datasetTree: HierarchyNode<UiNode>,
    savedSelections: Array<{ dataset: { value?: string } }>,
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
      // Find the node that matches this saved selection
      const nodeToRestore = datasetTree.find(
        (datasetNode) =>
          datasetNode.data.value === savedSelection.dataset['value']
      );
      if (!nodeToRestore) continue; // Skip if dataset no longer exists in current tree

      // Restore the selection state
      nodeToRestore.data.checked = true;
      // Ensure all children inherit the restored selection
      propagateToChildren(nodeToRestore, true);
      // Update parent chain to reflect the restored selection
      updateParentStates(nodeToRestore, true);
    }
  }
}
