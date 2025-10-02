import type { HierarchyNode } from 'd3-hierarchy';
import type { UiNode } from './types';

/**
 * Handles event processing for dataset columns
 */
export class DatasetColumnEventHandler {
  /**
   * Attaches checkbox change event listeners to the column.
   * @param column - The column element
   */
  attachCheckboxEventListeners(
    column: HTMLElement,
    data: HierarchyNode<UiNode>,
    onUpdateChildrenCheckState: (
      node: HierarchyNode<UiNode>,
      checked: boolean
    ) => void,
    onUpdateParentCheckState: (
      node: HierarchyNode<UiNode>,
      checked: boolean
    ) => void,
    onUpdateUI: () => void
  ): void {
    column.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const checked = target.checked;
      const listItem = target.closest('li');
      if (!listItem || !listItem.dataset.id) return;
      const nodeId = listItem.dataset.id;
      const changedNode = data.find((datum) => datum.data.id === nodeId);
      if (!changedNode) return;

      if (changedNode.children)
        onUpdateChildrenCheckState(changedNode, checked);
      if (changedNode.parent) onUpdateParentCheckState(changedNode, checked);

      onUpdateUI();
    });
  }

  /**
   * Attaches arrow click event listeners for drill-down navigation.
   * @param column - The column element
   * @param isLogin - Whether the user is logged in
   */
  attachArrowClickEventListeners(
    column: HTMLElement,
    isLogin: boolean,
    onHandleArrowClick: (
      listItem: Element,
      target: HTMLElement,
      isLogin: boolean
    ) => void
  ): void {
    for (const arrow of column.querySelectorAll(':scope > ul > li > .arrow')) {
      arrow.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const listItem = target.closest('li');
        if (!listItem) return;

        onHandleArrowClick(listItem, target, isLogin);
      });
    }
  }

  /**
   * Clears current selection and removes sub-columns.
   * @param listItem - The current list item
   */
  clearSelectionAndSubColumns(listItem: Element): void {
    const currentColumn = listItem.closest('.column') as HTMLElement;
    const columnsContainer = listItem.closest('.columns');
    if (!currentColumn || !columnsContainer || !currentColumn.dataset.depth)
      return;

    // Clear current selection
    const parentNode = listItem.parentNode as Element;
    if (parentNode) {
      parentNode
        .querySelector(':scope > .-selected')
        ?.classList.remove('-selected');
    }

    // Remove deeper columns
    const currentDepth = parseInt(currentColumn.dataset.depth);
    for (const column of columnsContainer.querySelectorAll(
      ':scope > .column'
    )) {
      const columnElement = column as HTMLElement;
      if (
        columnElement.dataset.depth &&
        parseInt(columnElement.dataset.depth) > currentDepth
      ) {
        const columnParent = columnElement.parentNode;
        if (columnParent) {
          columnParent.removeChild(columnElement);
        }
      }
    }
  }
}
