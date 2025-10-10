import type { HierarchyNode } from 'd3-hierarchy';
import type { UiNode } from './types';

/**
 * Manages the display optimization and labeling of selected datasets in the value summary.
 *
 * This class implements intelligent selection summarization logic:
 * - When all children of a category are selected, shows only the parent category
 * - When only some children are selected, shows the individual selected items
 * - Generates hierarchical path labels (e.g., "Genomic Studies > WGS > Dataset A")
 *
 * This optimization prevents the value summary from becoming cluttered with
 * redundant selections while maintaining clarity about what is actually selected.
 */
export class DatasetValueViewManager {
  /**
   * Determines the most concise way to represent selections in the value summary.
   *
   * This method implements smart selection summarization:
   * - If all children of a category are selected, returns only the parent category
   * - If only some children are selected, returns the individual selected children
   * - Recursively processes the entire tree to find the optimal representation
   *
   * This prevents redundant display like showing both "Genomic Studies" and all
   * its individual datasets when the entire category is selected.
   *
   * @param currentNode - The node to analyze for optimal display representation
   * @returns Array of nodes that should be shown in the value summary
   */
  getOptimalNodesToShow(
    currentNode: HierarchyNode<UiNode>
  ): HierarchyNode<UiNode>[] {
    // Base case: leaf nodes (no children)
    if (!currentNode.children) {
      return currentNode.data.checked ? [currentNode] : [];
    }

    // Check if all children are fully selected
    const allChildrenAreSelected = currentNode.children.every(
      (childNode) => childNode.data.checked
    );

    // If all children are selected and this node has a value, show just this parent
    if (allChildrenAreSelected && currentNode.data.value) {
      return [currentNode];
    } else {
      // Otherwise, recursively collect optimal nodes from children
      return currentNode.children
        .flatMap((childNode) => this.getOptimalNodesToShow(childNode))
        .filter(Boolean); // Remove any null/undefined values
    }
  }

  /**
   * Generates a hierarchical breadcrumb label showing the full path to a dataset.
   *
   * Creates a human-readable path from the root to the selected item:
   * - "Genomic Studies > WGS > Japanese Population"
   * - "Clinical Data > Phenotype > Disease Association"
   *
   * This helps users understand the context of their selections, especially
   * when datasets from different categories have similar names.
   *
   * @param selectedNode - The node to create a path label for
   * @param datasetTreeRoot - The root of the entire dataset hierarchy
   * @returns Human-readable hierarchical path string separated by ' > '
   */
  getLabelWithPath(
    selectedNode: HierarchyNode<UiNode>,
    datasetTreeRoot: HierarchyNode<UiNode>
  ): string {
    // Get the full path from root to selected node, then reverse to go root-to-leaf
    const fullPathNodes = selectedNode.path(datasetTreeRoot).reverse();
    // Remove the synthetic root node (first element) and keep only meaningful path nodes
    const [, ...meaningfulPathNodes] = fullPathNodes;
    // Extract labels and join with breadcrumb separator
    return meaningfulPathNodes
      .map((pathNode) => pathNode.data.label)
      .join(' > ');
  }
}
