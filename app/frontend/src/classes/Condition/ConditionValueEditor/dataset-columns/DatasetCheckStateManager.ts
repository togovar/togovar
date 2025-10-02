import type { HierarchyNode } from 'd3-hierarchy';
import type { UiNode } from './types';

/**
 * Manages checkbox selection states in a hierarchical dataset tree structure.
 *
 * This class handles the complex logic of maintaining consistent selection states
 * across parent-child relationships in a tree hierarchy. When a parent is selected,
 * all children become selected. When some (but not all) children are selected,
 * the parent shows an indeterminate state.
 *
 * Key responsibilities:
 * - Propagate selection changes from parent to all descendants
 * - Update parent states based on child selection patterns
 * - Synchronize DOM checkbox elements with data model states
 * - Handle three-state checkboxes: unchecked, checked, indeterminate
 */
export class DatasetCheckStateManager {
  /**
   * Propagates a selection state change from a parent node to all its descendants.
   *
   * When a user clicks a parent checkbox, this method ensures all child and
   * grandchild nodes inherit the same selection state. It also clears any
   * indeterminate states since all descendants now have a uniform state.
   *
   * @param parentNode - The node whose selection state should be propagated downward
   * @param isSelected - Whether the parent (and all descendants) should be selected
   */
  updateChildrenCheckState(
    parentNode: HierarchyNode<UiNode>,
    isSelected: boolean
  ): void {
    if (!parentNode.children || parentNode.children.length === 0) return;

    parentNode.descendants().forEach((descendant) => {
      descendant.data.checked = isSelected;
      descendant.data.indeterminate = false;
    });
  }

  /**
   * Updates parent node selection states by bubbling up changes from child nodes.
   *
   * This method recursively updates parent nodes based on their children's
   * selection states. A parent becomes:
   * - Checked: when all children are checked
   * - Indeterminate: when some (but not all) children are checked
   * - Unchecked: when no children are checked
   *
   * @param childNode - The node whose parent chain should be updated
   * @param explicitSelectionState - If provided, sets this node's state explicitly
   *                                 before calculating parent states
   */
  updateParentCheckState(
    childNode: HierarchyNode<UiNode> | undefined,
    explicitSelectionState?: boolean
  ): void {
    if (!childNode) return;

    if (typeof explicitSelectionState === 'boolean') {
      childNode.data.checked = explicitSelectionState;
      childNode.data.indeterminate = false;
    } else {
      this._calculateParentStateFromChildren(childNode);
    }

    // Recursively update the parent chain
    this.updateParentCheckState(childNode.parent || undefined);
  }

  /**
   * Determines the appropriate selection state for a parent based on its children.
   *
   * Analyzes all immediate children to determine if the parent should be:
   * - Fully selected (all children selected, none indeterminate)
   * - Indeterminate (mixed selection states among children)
   * - Unselected (no children selected)
   *
   * @param parentNode - The parent node whose state should be calculated
   */
  private _calculateParentStateFromChildren(
    parentNode: HierarchyNode<UiNode>
  ): void {
    if (!parentNode.children) return;

    const fullySelectedChildren = parentNode.children.filter(
      (child) => child.data.checked
    );
    const partiallySelectedChildren = parentNode.children.filter(
      (child) => child.data.indeterminate
    );

    const allChildrenSelected =
      fullySelectedChildren.length === parentNode.children.length;
    const someChildrenSelected = fullySelectedChildren.length > 0;
    const hasPartiallySelectedChildren = partiallySelectedChildren.length > 0;

    // Parent is fully selected only if all children are selected and none are indeterminate
    parentNode.data.checked =
      allChildrenSelected && !hasPartiallySelectedChildren;
    // Parent is indeterminate if there's a mix of selected/unselected children or any child is indeterminate
    parentNode.data.indeterminate =
      (someChildrenSelected && !allChildrenSelected) ||
      hasPartiallySelectedChildren;
  }

  /**
   * Synchronizes all DOM checkbox elements with their corresponding data model states.
   *
   * Traverses the entire dataset tree and updates each checkbox element in the DOM
   * to visually reflect the current selection state stored in the data model.
   * This ensures the UI always displays the correct selection states after
   * programmatic changes to the data.
   *
   * @param columnsContainer - The DOM element containing all the column elements
   * @param datasetTree - The root of the hierarchical dataset tree
   */
  updateCheckboxStatesInDOM(
    columnsContainer: HTMLElement,
    datasetTree: HierarchyNode<UiNode>
  ): void {
    datasetTree.eachAfter((datasetNode) => {
      const checkboxElement = columnsContainer.querySelector(
        `li[data-id="${datasetNode.data.id}"] > label > input`
      ) as HTMLInputElement;

      if (checkboxElement) {
        // Set checkbox state: checked only if fully selected (not indeterminate)
        checkboxElement.checked =
          !datasetNode.data.indeterminate && datasetNode.data.checked;
        // Show indeterminate state when some (but not all) children are selected
        checkboxElement.indeterminate =
          !datasetNode.data.checked &&
          (datasetNode.data.indeterminate || false);
      }
    });
  }
}
