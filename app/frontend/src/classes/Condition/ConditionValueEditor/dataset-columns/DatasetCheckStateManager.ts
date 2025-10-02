import type { HierarchyNode } from 'd3-hierarchy';
import type { UiNode } from './types';

/**
 * Handles check state management for dataset columns
 */
export class DatasetCheckStateManager {
  /**
   * Updates the check state of all children nodes.
   * @param node - The parent node
   * @param checked - The check state to apply
   */
  updateChildrenCheckState(
    node: HierarchyNode<UiNode>,
    checked: boolean
  ): void {
    if (!node.children || node.children.length === 0) return;

    node.descendants().forEach((descendant) => {
      descendant.data.checked = checked;
      descendant.data.indeterminate = false;
    });
  }

  /**
   * Updates the check state of parent nodes based on children states.
   * @param dataNode - The node whose parents should be updated
   * @param checked - Optional explicit check state for the current node
   */
  updateParentCheckState(
    dataNode: HierarchyNode<UiNode> | undefined,
    checked?: boolean
  ): void {
    if (!dataNode) return;

    if (typeof checked === 'boolean') {
      dataNode.data.checked = checked;
      dataNode.data.indeterminate = false;
    } else {
      this.calculateParentCheckState(dataNode);
    }

    this.updateParentCheckState(dataNode.parent || undefined);
  }

  /**
   * Calculates the check state for a parent node based on its children.
   * @param dataNode - The parent node to calculate state for
   */
  calculateParentCheckState(dataNode: HierarchyNode<UiNode>): void {
    if (!dataNode.children) return;

    const checkedChildren = dataNode.children.filter(
      (child) => child.data.checked
    );
    const indeterminateChildren = dataNode.children.filter(
      (child) => child.data.indeterminate
    );

    const allChecked = checkedChildren.length === dataNode.children.length;
    const someChecked = checkedChildren.length > 0;
    const hasIndeterminate = indeterminateChildren.length > 0;

    dataNode.data.checked = allChecked && !hasIndeterminate;
    dataNode.data.indeterminate =
      (someChecked && !allChecked) || hasIndeterminate;
  }

  /**
   * Updates checkbox states in the DOM to reflect data state.
   */
  updateCheckboxStatesInDOM(
    columns: HTMLElement,
    data: HierarchyNode<UiNode>
  ): void {
    data.eachAfter((datum) => {
      const checkbox = columns.querySelector(
        `li[data-id="${datum.data.id}"] > label > input`
      ) as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = !datum.data.indeterminate && datum.data.checked;
        checkbox.indeterminate =
          !datum.data.checked && (datum.data.indeterminate || false);
      }
    });
  }
}
