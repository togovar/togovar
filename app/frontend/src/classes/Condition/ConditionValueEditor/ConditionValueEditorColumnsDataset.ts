import type { HierarchyNode } from 'd3-hierarchy';
import { hierarchy } from 'd3-hierarchy';
import { CONDITION_TYPE } from '../../../definition';
import { ADVANCED_CONDITIONS } from '../../../global';
import type { ConditionItemView } from '../ConditionItemView';
import { ConditionValueEditor } from './ConditionValueEditor';
import type ConditionValues from '../ConditionValues.js';
import { storeManager } from '../../../store/StoreManager';

type DataNode = {
  id: string;
  label: string;
  value: string;
  children?: Array<DataNode>;
};

type DataNodeWithChecked = DataNode & {
  checked: boolean;
  indeterminate?: boolean;
};

const ROOT_NODE_ID = '-1';

/**
 * A condition value editor for hierarchical dataset selection using columns layout.
 * Provides functionality for selecting datasets with hierarchical drill-down navigation.
 */
export class ConditionValueEditorColumnsDataset extends ConditionValueEditor {
  private _lastValueViews: Array<HTMLDivElement> = [];
  private _data: HierarchyNode<DataNodeWithChecked>;
  private _columns: HTMLElement | null = null;
  private _nodesToShowInValueView: Array<HierarchyNode<DataNodeWithChecked>>;
  private _uniqueIdCounter: number;

  /**
   * Creates a new instance of ConditionValueEditorColumnsDataset.
   * @param valuesView - The condition values view component
   * @param conditionView - The condition item view component
   */
  constructor(valuesView: ConditionValues, conditionView: ConditionItemView) {
    super(valuesView, conditionView);

    this._data = this._prepareHierarchicalData();
    this._nodesToShowInValueView = [];
    this._uniqueIdCounter = 0;

    this._initializeUI();
    this._renderInitialColumn();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Saves the current value views for potential restoration.
   * Called when the user clicks the edit (pencil) icon.
   */
  keepLastValues(): void {
    this._lastValueViews = this._valueViews;
  }

  /**
   * Restores the previously saved values and updates the UI.
   * Called when the user presses the Cancel button.
   */
  restore(): void {
    this._resetAllCheckStates();
    this._restoreCheckedStates();
    this._updateUI();
    this._updateValueViews(this._lastValueViews);
  }

  /**
   * Checks if the current selection is valid.
   * @returns True if at least one item is selected
   */
  get isValid(): boolean {
    return this._isCurrentStateValid();
  }

  /**
   * Initializes the UI elements and structure.
   */
  private _initializeUI(): void {
    this._createElement(
      'columns-editor-view',
      `
    <header>Select ${this._conditionType}</header>
    <div class="body">
      <div class="columns"></div>
    </div>`
    );
    this._columns = this._body.querySelector(':scope > .columns');
  }

  /**
   * Renders the initial column with root level items.
   */
  private _renderInitialColumn(): void {
    this._drawColumn();
  }

  /**
   * Adds unique IDs to data nodes recursively.
   * @param dataNodes - Array of data nodes to process
   * @returns Array of data nodes with unique IDs and checked properties
   */
  private _addUniqueIdsToNodes(dataNodes: DataNode[]): DataNodeWithChecked[] {
    return dataNodes.map((node) => {
      if (!Number.isInteger(this._uniqueIdCounter)) {
        this._uniqueIdCounter = 0;
      }

      const processedNode: DataNodeWithChecked = {
        ...node,
        id: `${this._uniqueIdCounter++}`,
        checked: false,
        indeterminate: false,
      };

      if (processedNode.children && processedNode.children.length > 0) {
        processedNode.children = this._addUniqueIdsToNodes(
          processedNode.children
        );
      }

      return processedNode;
    });
  }

  /**
   * Prepares the hierarchical data structure based on condition type.
   * @returns Hierarchy node with processed data
   */
  private _prepareHierarchicalData(): HierarchyNode<DataNodeWithChecked> {
    switch (this._conditionType) {
      case CONDITION_TYPE.dataset:
      case CONDITION_TYPE.genotype: {
        const rawData = ADVANCED_CONDITIONS[this._conditionType]
          .values as DataNodeWithChecked[];
        const processedData = this._addUniqueIdsToNodes(rawData);

        return hierarchy<DataNodeWithChecked>({
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
          'ConditionValueEditorColumnsDataset - Invalid condition type'
        );
    }
  }

  /**
   * Renders a column with items from the specified parent node.
   * @param parentId - ID of the parent node to get children from
   */
  private async _drawColumn(parentId?: string): Promise<void> {
    const isLogin = storeManager.getData('isLogin');
    const items = await this._getChildItems(parentId);

    const column = this._createColumnElement();
    this._columns.append(column);

    column.innerHTML = this._generateColumnHTML(items, isLogin);

    this._attachColumnEventListeners(column, isLogin);
    this._updateUI();
    this._scrollToRevealNewColumn();
  }

  /**
   * Creates a new column DOM element with appropriate attributes.
   * @returns The created column element
   */
  private _createColumnElement(): HTMLDivElement {
    const column = document.createElement('div');
    column.classList.add('column');
    column.dataset.depth = this._columns
      .querySelectorAll(':scope > .column')
      .length.toString();
    return column;
  }

  /**
   * Generates HTML content for a column based on the provided items.
   * @param items - Array of hierarchy nodes to render
   * @param isLogin - Whether the user is logged in
   * @returns HTML string for the column content
   */
  private _generateColumnHTML(
    items: HierarchyNode<DataNodeWithChecked>[],
    isLogin: boolean
  ): string {
    return `
      <ul>
        ${items
          .map((item) => this._generateListItemHTML(item, isLogin))
          .join('')}
      </ul>`;
  }

  /**
   * Generates HTML for a single list item.
   * @param item - The hierarchy node to render
   * @param isLogin - Whether the user is logged in
   * @returns HTML string for the list item
   * @private
   */
  private _generateListItemHTML(
    item: HierarchyNode<DataNodeWithChecked>,
    isLogin: boolean
  ): string {
    const inputId = `checkbox-${item.data.id}`;
    let listItem = `<li data-id="${item.data.id}" data-parent="${item.parent.data.id}"`;

    if (item.data.value) {
      listItem += ` data-value="${item.data.value}"`;
    }

    listItem += `><label for="${inputId}">`;

    if (this._shouldShowLockIcon(item, isLogin)) {
      listItem += `<span class="lock"></span>`;
    } else {
      listItem += `<input type="checkbox" id="${inputId}" value="${item.data.id}">`;
    }

    if (this._shouldShowDatasetIcon(item)) {
      listItem += `<span class="dataset-icon" data-dataset="${item.data.value}"></span>`;
    }

    listItem += `<span>${item.data.label}</span></label>`;

    if (item.children !== undefined) {
      listItem += `<div class="arrow" data-id="${item.data.id}" data-value="${item.data.value}"></div>`;
    }

    listItem += `</li>`;
    return listItem;
  }

  /**
   * Determines if a lock icon should be shown for the item.
   * @param item - The hierarchy node to check
   * @param isLogin - Whether the user is logged in
   * @returns True if lock icon should be shown
   * @private
   */
  private _shouldShowLockIcon(
    item: HierarchyNode<DataNodeWithChecked>,
    isLogin: boolean
  ): boolean {
    return isLogin === false && item.data.value?.includes('jga_wgs.');
  }

  /**
   * Determines if a dataset icon should be shown for the item.
   * @param item - The hierarchy node to check
   * @returns True if dataset icon should be shown
   * @private
   */
  private _shouldShowDatasetIcon(
    item: HierarchyNode<DataNodeWithChecked>
  ): boolean {
    return (
      (this._conditionType === CONDITION_TYPE.dataset ||
        this._conditionType === CONDITION_TYPE.genotype) &&
      item.depth === 1
    );
  }

  /**
   * Attaches event listeners to the column element.
   * @param column - The column element to attach listeners to
   * @param isLogin - Whether the user is logged in
   * @private
   */
  private _attachColumnEventListeners(
    column: HTMLElement,
    isLogin: boolean
  ): void {
    this._attachCheckboxEventListeners(column);
    this._attachArrowClickEventListeners(column, isLogin);
  }

  /**
   * Attaches checkbox change event listeners to the column.
   * @param column - The column element
   * @private
   */
  private _attachCheckboxEventListeners(column: HTMLElement): void {
    column.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const checked = target.checked;
      const nodeId = target.closest('li').dataset.id;
      const changedNode = this._data.find((datum) => datum.data.id === nodeId);

      if (changedNode.children)
        this._updateChildrenCheckState(changedNode, checked);
      if (changedNode.parent)
        this._updateParentCheckState(changedNode, checked);

      this._updateUI();
    });
  }

  /**
   * Attaches arrow click event listeners for drill-down navigation.
   * @param column - The column element
   * @param isLogin - Whether the user is logged in
   */
  private _attachArrowClickEventListeners(
    column: HTMLElement,
    isLogin: boolean
  ): void {
    for (const arrow of column.querySelectorAll(':scope > ul > li > .arrow')) {
      arrow.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const listItem = target.closest('li');

        this._handleArrowClick(listItem, target, isLogin);
      });
    }
  }

  /**
   * Handles arrow click events for navigation.
   * @param listItem - The clicked list item
   * @param target - The arrow element that was clicked
   * @param isLogin - Whether the user is logged in
   */
  private _handleArrowClick(
    listItem: Element,
    target: HTMLElement,
    isLogin: boolean
  ): void {
    this._clearSelectionAndSubColumns(listItem);
    listItem.classList.add('-selected');
    this._drawColumn(target.dataset.id);

    if (target.dataset.value === 'jga_wgs' && !isLogin) {
      this._addLoginPromptColumn();
    }
  }

  /**
   * Clears current selection and removes sub-columns.
   * @param listItem - The current list item
   * @private
   */
  private _clearSelectionAndSubColumns(listItem: Element): void {
    const currentColumn = listItem.closest('.column') as HTMLElement;
    const columnsContainer = listItem.closest('.columns');

    // Clear current selection
    listItem.parentNode
      .querySelector(':scope > .-selected')
      ?.classList.remove('-selected');

    // Remove deeper columns
    const currentDepth = parseInt(currentColumn.dataset.depth);
    for (const column of columnsContainer.querySelectorAll(
      ':scope > .column'
    )) {
      const columnElement = column as HTMLElement;
      if (parseInt(columnElement.dataset.depth) > currentDepth) {
        columnElement.parentNode.removeChild(columnElement);
      }
    }
  }

  /**
   * Scrolls to reveal the newly added column if necessary.
   * @private
   */
  private _scrollToRevealNewColumn(): void {
    const left = this._body.scrollWidth - this._body.clientWidth;
    if (left > 0) {
      this._body.scrollTo({
        top: 0,
        left: left,
        behavior: 'smooth',
      });
    }
  }

  /**
   * Gets child items for the specified parent node.
   * @param parentId - ID of the parent node
   * @returns Promise resolving to array of child nodes
   */
  private _getChildItems(
    parentId?: string
  ): Promise<HierarchyNode<DataNodeWithChecked>[]> {
    return new Promise((resolve) => {
      if (!parentId) {
        resolve(this._data.children);
        return;
      }

      const parentNode = this._data.find((datum) => datum.data.id === parentId);
      resolve(parentNode?.children || []);
    });
  }

  /**
   * Adds a column prompting the user to login for JGAD datasets.
   */
  private async _addLoginPromptColumn(): Promise<void> {
    await storeManager.fetchLoginStatus();
    const column = document.createElement('div');
    column.classList.add('column');
    column.dataset.depth = '2';
    column.innerHTML = `
      <div class="messages-view">
        <div class="note message -warning">
          <a class="link" href="/auth/login">Login</a> to select JGAD datasets
        </div>
      </div>`;
    this._columns.append(column);
  }

  /**
   * Resets all check states in the data hierarchy.
   */
  private _resetAllCheckStates(): void {
    this._data.each((datum) => {
      datum.data.checked = false;
      datum.data.indeterminate = false;
    });
  }

  /**
   * Restores checked states from the last saved values.
   */
  private _restoreCheckedStates(): void {
    for (const lastValue of this._lastValueViews) {
      const node = this._data.find(
        (d) => d.data.value === lastValue.dataset['value']
      );
      if (!node) continue;

      node.data.checked = true;
      this._updateChildrenCheckState(node, true);
      this._updateParentCheckState(node, true);
    }
  }

  /**
   * Updates the check state of all children nodes.
   * @param node - The parent node
   * @param checked - The check state to apply
   */
  private _updateChildrenCheckState(
    node: HierarchyNode<DataNodeWithChecked>,
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
  private _updateParentCheckState(
    dataNode: HierarchyNode<DataNodeWithChecked> | undefined,
    checked?: boolean
  ): void {
    if (!dataNode) return;

    if (typeof checked === 'boolean') {
      dataNode.data.checked = checked;
      dataNode.data.indeterminate = false;
    } else {
      this._calculateParentCheckState(dataNode);
    }

    this._updateParentCheckState(dataNode.parent);
  }

  /**
   * Calculates the check state for a parent node based on its children.
   * @param dataNode - The parent node to calculate state for
   */
  private _calculateParentCheckState(
    dataNode: HierarchyNode<DataNodeWithChecked>
  ): void {
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
   * Updates the entire UI including DOM elements and value views.
   */
  private _updateUI(): void {
    this._updateCheckboxStatesInDOM();
    this._updateValueViews();
    this._validateAndUpdateValuesView();
  }

  /**
   * Updates checkbox states in the DOM to reflect data state.
   */
  private _updateCheckboxStatesInDOM(): void {
    this._data.eachAfter((datum) => {
      const checkbox: HTMLInputElement = this._columns.querySelector(
        `li[data-id="${datum.data.id}"] > label > input`
      );
      if (checkbox) {
        checkbox.checked = !datum.data.indeterminate && datum.data.checked;
        checkbox.indeterminate =
          !datum.data.checked && datum.data.indeterminate;
      }
    });
  }

  /**
   * Updates the value views with current selections.
   */
  private _updateValueViews(): void {
    this._processNodesToShowInValueView();
    this._clearValueViews();

    for (const nodeToShow of this._nodesToShowInValueView) {
      this._addValueView(
        nodeToShow.data.value,
        this._getLabelWithPath(nodeToShow)
      );
    }
  }

  /**
   * Validates the current state and updates the values view accordingly.
   */
  private _validateAndUpdateValuesView(): void {
    this._valuesView.update(this._isCurrentStateValid());
  }

  /**
   * Processes nodes to determine which should be shown in value view.
   */
  private _processNodesToShowInValueView(): void {
    this._nodesToShowInValueView = this._getOptimalNodesToShow(this._data);
  }

  /**
   * Gets the optimal nodes to show in value view (parent nodes when all children are selected).
   * @param node - The node to process
   * @returns Array of nodes that should be displayed
   */
  private _getOptimalNodesToShow(
    node: HierarchyNode<DataNodeWithChecked>
  ): HierarchyNode<DataNodeWithChecked>[] {
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
        .flatMap((child) => this._getOptimalNodesToShow(child))
        .filter(Boolean);
    }
  }

  /**
   * Gets the full path label for a node to display in value view.
   * @param node - The node to get label for
   * @returns Formatted label with full path
   */
  private _getLabelWithPath(node: HierarchyNode<DataNodeWithChecked>): string {
    const [, ...pathNodes] = node.path(this._data).reverse();
    return pathNodes.map((pathNode) => pathNode.data.label).join(' > ');
  }

  /**
   * Validates if the current state is valid.
   * @returns True if the current state is valid
   */
  private _isCurrentStateValid(): boolean {
    return this._valueViews.length > 0;
  }
}
