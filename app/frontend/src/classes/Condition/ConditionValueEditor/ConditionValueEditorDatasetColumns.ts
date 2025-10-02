import type { HierarchyNode } from 'd3-hierarchy';
import type { ConditionItemView } from '../ConditionItemView';
import { ConditionValueEditor } from './ConditionValueEditor';
import type ConditionValues from '../ConditionValues.js';
import { storeManager } from '../../../store/StoreManager';

// Import separated modules
import { DatasetTreeDataProcessor } from './dataset-columns/DatasetTreeDataProcessor';
import { DatasetColumnRenderer } from './dataset-columns/DatasetColumnRenderer';
import { DatasetColumnEventHandler } from './dataset-columns/DatasetColumnEventHandler';
import { DatasetCheckStateManager } from './dataset-columns/DatasetCheckStateManager';
import { DatasetValueViewManager } from './dataset-columns/DatasetValueViewManager';
import type { UiNode } from './dataset-columns/types';
import { createEl } from '../../../utils/dom/createEl';

/**
 * A condition value editor for hierarchical dataset selection using columns layout.
 * Provides functionality for selecting datasets with hierarchical drill-down navigation.
 */
export class ConditionValueEditorDatasetColumns extends ConditionValueEditor {
  private _lastValueViews: Array<{ dataset: { value?: string } }> = [];
  private _data: HierarchyNode<UiNode>;
  private _columns: HTMLElement | null = null;
  private _nodesToShowInValueView: Array<HierarchyNode<UiNode>>;

  // Separated modules
  private _dataProcessor = new DatasetTreeDataProcessor();
  private _renderer = new DatasetColumnRenderer();
  private _eventHandler = new DatasetColumnEventHandler();
  private _checkStateManager = new DatasetCheckStateManager();
  private _valueViewManager = new DatasetValueViewManager();

  /**
   * Creates a new instance of ConditionValueEditorDatasetColumns.
   * @param valuesView - The condition values view component
   * @param conditionView - The condition item view component
   */
  constructor(valuesView: ConditionValues, conditionView: ConditionItemView) {
    super(valuesView, conditionView);

    this._data = this._dataProcessor.prepareHierarchicalData(
      this._conditionType
    );
    this._nodesToShowInValueView = [];

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
    this._dataProcessor.resetAllCheckStates(this._data);
    this._dataProcessor.restoreCheckedStates(
      this._data,
      this._lastValueViews,
      (node, checked) =>
        this._checkStateManager.updateChildrenCheckState(node, checked),
      (node, checked) =>
        this._checkStateManager.updateParentCheckState(node, checked)
    );
    this._updateUI();
  }

  /**
   * Checks if the current selection is valid.
   * @returns True if at least one item is selected
   */
  get isValid(): boolean {
    return this._valueViews.length > 0;
  }

  /**
   * Initializes the UI elements and structure.
   */
  private _initializeUI(): void {
    this._createElement('columns-editor-view', () => [
      createEl('header', { text: `Select ${this._conditionType}` }),
      createEl('div', {
        class: 'body',
        children: [createEl('div', { class: 'columns' })],
      }),
    ]);

    // safety checks
    if (!this.bodyEl) throw new Error('columns-editor-view: .body not found');
    this._columns =
      this.bodyEl.querySelector<HTMLDivElement>(':scope > .columns');
    if (!this._columns)
      throw new Error('columns-editor-view: .columns not found');
  }

  /**
   * Renders the initial column with root level items.
   */
  private _renderInitialColumn(): void {
    this._drawColumn();
  }

  /**
   * Renders a column with items from the specified parent node.
   * @param parentId - ID of the parent node to get children from
   */
  private async _drawColumn(parentId?: string): Promise<void> {
    const isLogin = storeManager.getData('isLogin');
    const items = await this._getChildItems(parentId);

    const column = this._createColumnElement();
    if (!this._columns) throw new Error('Columns container not found');
    this._columns.append(column);

    column.append(this._generateColumnList(items, isLogin));

    this._attachColumnEventListeners(column, isLogin);
    this._updateUI();
    this._scrollToRevealNewColumn();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DOM Generation and Rendering (delegated to DatasetColumnRenderer)
  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Generates HTML content for a column based on the provided items.
   * @param items - Array of hierarchy nodes to render
   * @param isLogin - Whether the user is logged in
   * @returns HTML string for the column content
   */
  private _generateColumnList(
    items: HierarchyNode<UiNode>[],
    isLogin: boolean
  ): HTMLUListElement {
    return this._renderer.generateColumnList(
      items,
      isLogin,
      this._conditionType
    );
  }

  /**
   * Creates a new column DOM element with appropriate attributes.
   * @returns The created column element
   */
  private _createColumnElement(): HTMLDivElement {
    if (!this._columns) throw new Error('Columns container not found');
    return this._renderer.createColumnElement(this._columns);
  }

  /**
   * Adds a column prompting the user to login for JGAD datasets.
   */
  private async _addLoginPromptColumn(): Promise<void> {
    if (!this._columns) throw new Error('columns not mounted');
    await this._renderer.addLoginPromptColumn(this._columns);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Event Handling (delegated to DatasetColumnEventHandler)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Attaches event listeners to the column element.
   * @param column - The column element to attach listeners to
   * @param isLogin - Whether the user is logged in
   */
  private _attachColumnEventListeners(
    column: HTMLElement,
    isLogin: boolean
  ): void {
    this._eventHandler.attachCheckboxEventListeners(
      column,
      this._data,
      (node, checked) =>
        this._checkStateManager.updateChildrenCheckState(node, checked),
      (node, checked) =>
        this._checkStateManager.updateParentCheckState(node, checked),
      () => this._updateUI()
    );
    this._eventHandler.attachArrowClickEventListeners(
      column,
      isLogin,
      (listItem, target, isLogin) =>
        this._handleArrowClick(listItem, target, isLogin)
    );
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
    this._eventHandler.clearSelectionAndSubColumns(listItem);
    listItem.classList.add('-selected');
    this._drawColumn(target.dataset.id);

    if (target.dataset.value === 'jga_wgs' && !isLogin) {
      this._addLoginPromptColumn();
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // State Management (delegated to DatasetCheckStateManager)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Updates the entire UI including DOM elements and value views.
   */
  private _updateUI(): void {
    if (this._columns) {
      this._checkStateManager.updateCheckboxStatesInDOM(
        this._columns,
        this._data
      );
    }
    this._updateValueViews();
    this._valuesView.update(this.isValid);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Value Display Logic (delegated to DatasetValueViewManager)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Processes nodes to determine which should be shown in value view.
   */
  private _processNodesToShowInValueView(): void {
    this._nodesToShowInValueView = this._valueViewManager.getOptimalNodesToShow(
      this._data
    );
  }

  /**
   * Scrolls to reveal the newly added column if necessary.
   */
  private _scrollToRevealNewColumn(): void {
    if (!this.bodyEl) return;
    const left = this.bodyEl.scrollWidth - this.bodyEl.clientWidth;
    if (left > 0) {
      this.bodyEl.scrollTo({
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
  private _getChildItems(parentId?: string): Promise<HierarchyNode<UiNode>[]> {
    return new Promise((resolve) => {
      if (!parentId) {
        resolve(this._data.children || []);
        return;
      }

      const parentNode = this._data.find((datum) => datum.data.id === parentId);
      resolve(parentNode?.children || []);
    });
  }

  /**
   * Updates the value views with current selections.
   */
  protected _updateValueViews(): void {
    this._processNodesToShowInValueView();
    this._clearValueViews();

    for (const nodeToShow of this._nodesToShowInValueView) {
      this._addValueView(
        nodeToShow.data.value || '',
        this._valueViewManager.getLabelWithPath(nodeToShow, this._data)
      );
    }
  }
}
