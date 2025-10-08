import type { HierarchyNode } from 'd3-hierarchy';
import type { ConditionItemView } from '../ConditionItemView';
import { ConditionValueEditor } from './ConditionValueEditor';
import type ConditionValues from '../ConditionValues';
import { storeManager } from '../../../store/StoreManager';

// Import separated modules
import { DatasetTreeDataProcessor } from './dataset-columns/DatasetTreeDataProcessor';
import { DatasetColumnRenderer } from './dataset-columns/DatasetColumnRenderer';
import { DatasetColumnEventHandler } from './dataset-columns/DatasetColumnEventHandler';
import { DatasetCheckStateManager } from './dataset-columns/DatasetCheckStateManager';
import { DatasetValueViewManager } from './dataset-columns/DatasetValueViewManager';
import type { UiNode } from './dataset-columns/types';
import { createEl } from '../../../utils/dom/createEl';
import { selectRequired } from '../../../utils/dom/select';

/**
 * A condition value editor that displays datasets in a hierarchical column-based interface.
 *
 * Similar to macOS Finder's column view, this interface allows users to:
 * - Navigate through dataset categories by clicking arrows
 * - Select individual datasets or entire categories with checkboxes
 * - View parent-child selection relationships (indeterminate states)
 * - Handle restricted datasets that require authentication
 *
 * The interface dynamically creates columns as users drill down through the hierarchy,
 * with each column showing the children of the selected item in the previous column.
 */
export class ConditionValueEditorDatasetColumns extends ConditionValueEditor {
  /** Previously selected values, stored for cancellation/restore functionality */
  private _lastValueViews: Array<{ dataset: { value?: string } }> = [];

  /** The complete hierarchical tree structure of all available datasets */
  private _data: HierarchyNode<UiNode>;

  /** The main DOM container that holds all the column elements */
  private _columns: HTMLElement | null = null;

  /** Array of currently selected nodes that should appear in the value display */
  private _nodesToShowInValueView: Array<HierarchyNode<UiNode>>;

  // ═══════════════════════════════════════════════════════════════════════════════
  // Specialized modules - each handles a specific aspect of the interface
  // ═══════════════════════════════════════════════════════════════════════════════

  /** Converts raw dataset configuration into hierarchical tree structures */
  private _dataProcessor = new DatasetTreeDataProcessor();

  /** Creates DOM elements for columns, checkboxes, and navigation arrows */
  private _renderer = new DatasetColumnRenderer();

  /** Handles user interactions: checkbox changes, arrow clicks, navigation */
  private _eventHandler = new DatasetColumnEventHandler();

  /** Manages selection state propagation between parent and child nodes */
  private _checkStateManager = new DatasetCheckStateManager();

  /** Determines which selected values should be displayed in the summary */
  private _valueViewManager = new DatasetValueViewManager();

  /**
   * Creates a new hierarchical dataset selection interface.
   *
   * Initializes the column-based UI and loads the dataset hierarchy based on the
   * condition type (e.g., 'dataset' or 'genotype'). The interface starts with
   * the root categories displayed in the first column.
   *
   * @param valuesView - Component that displays the selected values summary
   * @param conditionView - Parent component that contains this editor
   */
  constructor(valuesView: ConditionValues, conditionView: ConditionItemView) {
    super(valuesView, conditionView);

    this._data = this._dataProcessor.prepareHierarchicalData(
      this._conditionType
    );
    this._nodesToShowInValueView = [];

    this._initializeUI();
    this._initializeWithLoginStatus();
  }

  /**
   * Initializes the interface after ensuring login status is fetched.
   */
  private async _initializeWithLoginStatus(): Promise<void> {
    await storeManager.fetchLoginStatus();
    this._renderInitialColumn();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Captures a snapshot of the current selection state for later restoration.
   *
   * This creates a backup of the current selections so that if the user clicks
   * "Cancel" during editing, we can restore the interface to this exact state.
   * Called automatically when the user begins editing (clicks the pencil icon).
   */
  keepLastValues(): void {
    this._lastValueViews = this._valueViews;
  }

  /**
   * Reverts all selections back to the previously saved state.
   *
   * This method:
   * 1. Clears all current selection states in the data tree
   * 2. Restores the selections from the saved snapshot
   * 3. Updates parent/child relationships to maintain consistency
   * 4. Refreshes the UI to reflect the restored state
   *
   * Called when the user clicks "Cancel" to abandon their changes.
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
   * Determines whether the current selection state is valid for saving.
   *
   * A valid selection requires at least one dataset to be selected.
   * This is used to enable/disable the "Apply" button and show validation messages.
   *
   * @returns true if one or more datasets are selected, false if none are selected
   */
  get isValid(): boolean {
    return this._valueViews.length > 0;
  }

  /**
   * Sets up the basic DOM structure for the column-based interface.
   *
   * Creates:
   * - Header with condition type (e.g., "Select dataset")
   * - Body container for the scrollable content
   * - Columns container that will hold the individual column elements
   *
   * Also stores references to key DOM elements for later use.
   */
  private _initializeUI(): void {
    this._createElement('columns-editor-view', () => [
      createEl('header', { text: `Select ${this._conditionType}` }),
      createEl('div', {
        class: 'body',
        children: [createEl('div', { class: 'columns' })],
      }),
    ]);

    // Use selectRequired for safer DOM element retrieval
    this._columns = selectRequired<HTMLDivElement>(
      this.bodyEl,
      ':scope > .columns',
      'ConditionValueEditorDatasetColumns._initializeUI'
    );
  }

  /**
   * Displays the first column containing the top-level dataset categories.
   *
   * This is called during initialization to show the root categories
   * (e.g., "Genomic Studies", "Clinical Data") that users can navigate into.
   */
  private _renderInitialColumn(): void {
    this._drawColumn();
  }

  /**
   * Creates and displays a new column showing the children of a selected item.
   *
   * This method:
   * 1. Uses the provided login status (for restricted dataset handling)
   * 2. Retrieves child items for the specified parent (or root if no parent)
   * 3. Creates a new column DOM element
   * 4. Renders the child items as a list with checkboxes and navigation arrows
   * 5. Attaches event listeners for user interactions
   * 6. Updates the overall UI state
   *
   * @param parentId - ID of the parent node whose children should be displayed.
   *                   If undefined, shows root-level categories.
   * @param userIsLoggedIn - Whether the current user is authenticated.
   *                         If undefined, fetches from store manager.
   */
  private async _drawColumn(
    parentId?: string,
    userIsLoggedIn?: boolean
  ): Promise<void> {
    const loginStatus: boolean =
      userIsLoggedIn ?? storeManager.getData('isLogin');

    const childItems = await this._getChildItems(parentId);

    const newColumnElement = this._createColumnElement();
    if (!this._columns) throw new Error('Columns container not found');
    this._columns.append(newColumnElement);

    newColumnElement.append(this._generateColumnList(childItems, loginStatus));

    this._attachColumnEventListeners(newColumnElement, loginStatus);
    this._updateUI();
    this._scrollToRevealNewColumn();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DOM Generation and Rendering (delegated to DatasetColumnRenderer)
  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Creates a list of selectable items for display in a column.
   *
   * Each item in the list includes:
   * - A checkbox for selection (or lock icon for restricted datasets)
   * - The item label (dataset name or category name)
   * - An arrow for navigation if the item has children
   *
   * @param hierarchyItems - Array of dataset nodes to display in this column
   * @param userIsLoggedIn - Whether the current user is authenticated (affects restricted dataset display)
   * @returns HTML unordered list element containing all the selectable items
   */
  private _generateColumnList(
    hierarchyItems: HierarchyNode<UiNode>[],
    userIsLoggedIn: boolean
  ): HTMLUListElement {
    return this._renderer.generateColumnList(
      hierarchyItems,
      userIsLoggedIn,
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
   * @param userIsLoggedIn - Whether the user is logged in
   */
  private _attachColumnEventListeners(
    column: HTMLElement,
    userIsLoggedIn: boolean
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
      userIsLoggedIn,
      (listItem, target, userIsLoggedIn) =>
        this._handleArrowClick(listItem, target, userIsLoggedIn)
    );
  }

  /**
   * Handles arrow click events for navigation.
   * @param listItem - The clicked list item
   * @param target - The arrow element that was clicked
   * @param userIsLoggedIn - Whether the user is logged in
   */
  private _handleArrowClick(
    listItem: Element,
    target: HTMLElement,
    userIsLoggedIn: boolean
  ): void {
    this._eventHandler.clearSelectionAndSubColumns(listItem);
    listItem.classList.add('-selected');
    this._drawColumn(target.dataset.id, userIsLoggedIn);

    if (target.dataset.value === 'jga_wgs' && !userIsLoggedIn) {
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
   * Retrieves child items for the specified parent node in the hierarchy.
   * Returns root-level children if no parent ID is provided.
   * @param parentId - ID of the parent node to get children for, or undefined for root level
   * @returns Promise resolving to array of child hierarchy nodes
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
   * Updates the value views to reflect the current selection state.
   * Processes nodes that should be shown, clears existing views, and adds
   * new value views with appropriate labels and paths.
   */
  protected _updateValueViews(): void {
    this._processNodesToShowInValueView();
    this._clearValueViews();

    for (const selectedNode of this._nodesToShowInValueView) {
      this._addValueView(
        selectedNode.data.value || '',
        this._valueViewManager.getLabelWithPath(selectedNode, this._data)
      );
    }
  }
}
