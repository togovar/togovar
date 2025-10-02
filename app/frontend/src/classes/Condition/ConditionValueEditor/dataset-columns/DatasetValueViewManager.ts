import type { HierarchyNode } from 'd3-hierarchy';
import type { UiNode } from './types';

/**
 * Handles value display logic for dataset columns
 */
export class DatasetValueViewManager {
  /**
   * Gets the optimal nodes to show in value view (parent nodes when all children are selected).
   * @param node - The node to process
   * @returns Array of nodes that should be displayed
   */
  getOptimalNodesToShow(node: HierarchyNode<UiNode>): HierarchyNode<UiNode>[] {
    if (!node.children) {
      return node.data.checked ? [node] : [];
    }

    const allChildrenChecked = node.children.every(
      (child) => child.data.checked
    );

    if (allChildrenChecked && node.data.value) {
      return [node];
    } else {
      return node.children
        .flatMap((child) => this.getOptimalNodesToShow(child))
        .filter(Boolean);
    }
  }

  /**
   * Gets the full path label for a node to display in value view.
   * @param node - The node to get label for
   * @returns Formatted label with full path
   */
  getLabelWithPath(
    node: HierarchyNode<UiNode>,
    rootData: HierarchyNode<UiNode>
  ): string {
    const [, ...pathNodes] = node.path(rootData).reverse();
    return pathNodes.map((pathNode) => pathNode.data.label).join(' > ');
  }
}
