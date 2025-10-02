import type { HierarchyNode } from 'd3-hierarchy';
import type { UiNode } from './types';

/**
 * Manages user interaction events within the hierarchical dataset column interface.
 *
 * This class encapsulates all event handling logic for the column-based navigation:
 * - Checkbox selection events that trigger state changes in the data model
 * - Arrow click events that enable drilling down into dataset categories
 * - Navigation state management including selection highlighting and column cleanup
 *
 * By centralizing event handling, this class maintains clean separation between
 * UI interactions and business logic, making the codebase more maintainable.
 */
export class DatasetColumnEventHandler {
  /**
   * Sets up checkbox change event listeners for dataset selection within a column.
   *
   * When a user clicks a checkbox, this method:
   * 1. Identifies which dataset node was clicked
   * 2. Propagates the selection state to children (if any)
   * 3. Updates parent selection states to reflect the change
   * 4. Triggers a UI refresh to show the updated states
   *
   * @param columnElement - The DOM element containing the checkboxes to monitor
   * @param datasetTree - The complete hierarchical data structure for node lookups
   * @param propagateToChildren - Callback to update all child nodes when parent is selected
   * @param updateParentStates - Callback to recalculate parent states when child changes
   * @param refreshUserInterface - Callback to update the visual interface after state changes
   */
  attachCheckboxEventListeners(
    columnElement: HTMLElement,
    datasetTree: HierarchyNode<UiNode>,
    propagateToChildren: (
      node: HierarchyNode<UiNode>,
      isSelected: boolean
    ) => void,
    updateParentStates: (
      node: HierarchyNode<UiNode>,
      isSelected: boolean
    ) => void,
    refreshUserInterface: () => void
  ): void {
    columnElement.addEventListener('change', (event) => {
      const clickedCheckbox = event.target as HTMLInputElement;
      const isNowSelected = clickedCheckbox.checked;
      const listItemElement = clickedCheckbox.closest('li');
      if (!listItemElement || !listItemElement.dataset.id) return;

      const datasetId = listItemElement.dataset.id;
      const clickedDatasetNode = datasetTree.find(
        (datum) => datum.data.id === datasetId
      );
      if (!clickedDatasetNode) return;

      // If this node has children, propagate the selection state downward
      if (clickedDatasetNode.children) {
        propagateToChildren(clickedDatasetNode, isNowSelected);
      }

      // If this node has a parent, update parent states based on sibling selections
      if (clickedDatasetNode.parent) {
        updateParentStates(clickedDatasetNode, isNowSelected);
      }

      refreshUserInterface();
    });
  }

  /**
   * Sets up navigation arrow click events for drilling down into dataset categories.
   *
   * When a user clicks a navigation arrow, this method:
   * 1. Identifies which dataset category was clicked
   * 2. Delegates to the provided callback to handle the navigation logic
   * 3. Passes along the user's login status to handle restricted datasets
   *
   * @param columnElement - The DOM element containing the navigation arrows
   * @param userIsLoggedIn - Whether the current user is authenticated (affects restricted dataset access)
   * @param handleNavigationClick - Callback function to process the arrow click and create new columns
   */
  attachArrowClickEventListeners(
    columnElement: HTMLElement,
    userIsLoggedIn: boolean,
    handleNavigationClick: (
      clickedListItem: Element,
      clickedArrow: HTMLElement,
      userIsLoggedIn: boolean
    ) => void
  ): void {
    for (const navigationArrow of columnElement.querySelectorAll(
      ':scope > ul > li > .arrow'
    )) {
      navigationArrow.addEventListener('click', (event) => {
        const clickedArrowElement = event.target as HTMLElement;
        const parentListItem = clickedArrowElement.closest('li');
        if (!parentListItem) return;

        handleNavigationClick(
          parentListItem,
          clickedArrowElement,
          userIsLoggedIn
        );
      });
    }
  }

  /**
   * Cleans up the interface when navigating to a new category.
   *
   * This method performs two important cleanup tasks:
   * 1. Removes the visual selection highlight from the previously selected item
   * 2. Removes all columns that are deeper than the current navigation level
   *
   * This ensures the interface shows a clean navigation path without
   * outdated selections or stale sub-columns from previous navigation.
   *
   * @param clickedListItem - The list item that was just clicked for navigation
   */
  clearSelectionAndSubColumns(clickedListItem: Element): void {
    const currentColumnElement = clickedListItem.closest(
      '.column'
    ) as HTMLElement;
    const allColumnsContainer = clickedListItem.closest('.columns');
    if (
      !currentColumnElement ||
      !allColumnsContainer ||
      !currentColumnElement.dataset.depth
    )
      return;

    // Remove selection highlight from previously selected item in this column
    const parentListContainer = clickedListItem.parentNode as Element;
    if (parentListContainer) {
      parentListContainer
        .querySelector(':scope > .-selected')
        ?.classList.remove('-selected');
    }

    // Remove all columns that are deeper than the current navigation level
    const currentNavigationDepth = parseInt(currentColumnElement.dataset.depth);
    for (const columnInContainer of allColumnsContainer.querySelectorAll(
      ':scope > .column'
    )) {
      const columnElement = columnInContainer as HTMLElement;
      if (
        columnElement.dataset.depth &&
        parseInt(columnElement.dataset.depth) > currentNavigationDepth
      ) {
        const parentContainer = columnElement.parentNode;
        if (parentContainer) {
          parentContainer.removeChild(columnElement);
        }
      }
    }
  }
}
