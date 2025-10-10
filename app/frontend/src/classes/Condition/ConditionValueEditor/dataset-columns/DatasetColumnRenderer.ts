import type { HierarchyNode } from 'd3-hierarchy';
import { createEl } from '../../../../utils/dom/createEl';
import { CONDITION_TYPE } from '../../../../definition';
import { storeManager } from '../../../../store/StoreManager';
import type { UiNode } from './types';

/**
 * Responsible for creating and rendering DOM elements within the dataset column interface.
 *
 * This class transforms hierarchical dataset data into interactive HTML elements:
 * - Converts dataset nodes into list items with checkboxes, labels, and navigation arrows
 * - Handles different visual states (checkboxes vs lock icons for restricted datasets)
 * - Creates column containers that organize the hierarchical navigation
 * - Generates special UI elements like login prompts for restricted content
 *
 * The rendered elements are designed to work seamlessly with the event handling
 * and state management systems to provide a complete interactive experience.
 */
export class DatasetColumnRenderer {
  private readonly _instancePrefix: string;

  /**
   * Creates a new DatasetColumnRenderer instance.
   * @param instancePrefix - Unique prefix for this instance to ensure globally unique element IDs
   */
  constructor(instancePrefix: string = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`) {
    this._instancePrefix = instancePrefix;
  }

  /**
   * Creates a complete HTML list of selectable dataset items for display in a column.
   *
   * This method transforms an array of hierarchical dataset nodes into a structured
   * HTML unordered list where each item includes:
   * - A checkbox (or lock icon for restricted datasets)
   * - Dataset icon (for certain condition types)
   * - Readable label text
   * - Navigation arrow (if the item has children)
   *
   * @param datasetNodes - Array of hierarchical dataset nodes to render as list items
   * @param userIsLoggedIn - Whether the current user is authenticated (affects restricted dataset display)
   * @param conditionType - The type of condition being edited (affects icon display)
   * @returns Complete HTML unordered list element ready for insertion into a column
   */
  generateColumnList(
    datasetNodes: HierarchyNode<UiNode>[],
    userIsLoggedIn: boolean,
    conditionType: string
  ): HTMLUListElement {
    return createEl('ul', {
      children: datasetNodes.map((datasetNode) =>
        this._createListItemElement(datasetNode, userIsLoggedIn, conditionType)
      ),
    });
  }

  /**
   * Creates a single interactive list item representing a dataset or category.
   *
   * Each list item is a complex element containing:
   * - A unique identifier for event handling and state management
   * - A checkbox for selection (or lock icon if restricted and user not logged in)
   * - Optional dataset icon for visual categorization
   * - Human-readable label text
   * - Optional navigation arrow for items with children
   *
   * @param datasetNode - The hierarchical dataset node to render
   * @param userIsLoggedIn - Whether the current user is authenticated
   * @param conditionType - The type of condition being edited
   * @returns Complete HTML list item element with all interactive components
   */
  private _createListItemElement(
    datasetNode: HierarchyNode<UiNode>,
    userIsLoggedIn: boolean,
    conditionType: string
  ): HTMLLIElement {
    const uniqueCheckboxId = `checkbox-${this._instancePrefix}-${datasetNode.data.id}`;

    // Show either a clickable checkbox or a lock icon for restricted datasets
    const selectionElement = this.shouldShowLockIcon(
      datasetNode,
      userIsLoggedIn
    )
      ? createEl('span', { class: 'lock' })
      : createEl('input', {
          attrs: { type: 'checkbox', id: uniqueCheckboxId },
          domProps: { value: datasetNode.data.id },
        });

    // Add dataset icon for visual categorization (only for specific condition types and depths)
    const categoryIcon = this.shouldShowDatasetIcon(datasetNode, conditionType)
      ? createEl('span', {
          class: 'dataset-icon',
          dataset: datasetNode.data.value
            ? { dataset: datasetNode.data.value }
            : undefined,
        })
      : null;

    // Create the readable text label
    const labelText = createEl('span', { text: datasetNode.data.label });

    // Combine all elements into a clickable label
    const labelElement = createEl('label', {
      attrs: { for: uniqueCheckboxId },
      children: [
        selectionElement,
        ...(categoryIcon ? [categoryIcon] : []),
        labelText,
      ],
    });

    // Add navigation arrow only for items that have children to drill into
    const navigationArrow =
      datasetNode.children !== undefined
        ? createEl('div', {
            class: 'arrow',
            dataset: {
              id: datasetNode.data.id,
              ...(datasetNode.data.value
                ? { value: datasetNode.data.value }
                : {}),
            },
          })
        : null;

    // Create the final list item with all data attributes for event handling
    return createEl('li', {
      dataset: {
        id: datasetNode.data.id,
        parent: datasetNode.parent?.data.id ?? '',
        ...(datasetNode.data.value ? { value: datasetNode.data.value } : {}),
      },
      children: [labelElement, ...(navigationArrow ? [navigationArrow] : [])],
    });
  }

  /**
   * Creates a new column container element for the hierarchical navigation interface.
   *
   * Each column represents one level of the hierarchy and is assigned a depth
   * value based on how many columns already exist. This depth is used for
   * navigation cleanup when users go back to previous levels.
   *
   * @param columnsContainer - The parent container that holds all column elements
   * @returns A new column div element ready to be populated with dataset items
   */
  createColumnElement(columnsContainer: HTMLElement): HTMLDivElement {
    const newColumnElement = document.createElement('div');
    newColumnElement.classList.add('column');
    // Set depth based on number of existing columns for navigation management
    newColumnElement.dataset.depth = columnsContainer
      .querySelectorAll(':scope > .column')
      .length.toString();
    return newColumnElement;
  }

  /**
   * Creates and displays a special column that prompts users to log in for restricted datasets.
   *
   * This column appears when users try to access JGA-WGS (restricted) datasets
   * without being authenticated. It provides a clear login link and explanation
   * instead of showing the restricted dataset items.
   *
   * @param columnsContainer - The parent container where the login prompt column should be added
   */
  async addLoginPromptColumn(columnsContainer: HTMLElement): Promise<void> {
    // Ensure we have the latest login status before showing the prompt
    await storeManager.fetchLoginStatus();

    const loginPromptColumn = createEl('div', {
      class: 'column',
      dataset: { depth: '2' }, // Fixed depth for login prompt columns
      children: [
        createEl('div', {
          class: 'messages-view',
          children: [
            createEl('div', {
              class: ['note', 'message', '-warning'],
              children: [
                createEl('a', {
                  class: 'link',
                  attrs: { href: '/auth/login' },
                  text: 'Login',
                }),
                ' to select JGAD datasets',
              ],
            }),
          ],
        }),
      ],
    });

    columnsContainer.append(loginPromptColumn);
  }

  /**
   * Determines whether a lock icon should be displayed instead of a checkbox.
   *
   * Lock icons are shown for restricted datasets (JGA-WGS) when the user
   * is not authenticated. This provides a visual indication that the dataset
   * requires login to access, preventing user confusion about why they can't
   * select certain items.
   *
   * @param datasetNode - The hierarchical dataset node to check for restrictions
   * @param userIsLoggedIn - Whether the current user is authenticated
   * @returns True if a lock icon should be shown instead of a checkbox
   */
  private shouldShowLockIcon(
    datasetNode: HierarchyNode<UiNode>,
    userIsLoggedIn: boolean
  ): boolean {
    return (
      userIsLoggedIn === false &&
      (datasetNode.data.value?.includes('jga_wgs.') ?? false)
    );
  }

  /**
   * Determines whether a dataset icon should be displayed for visual categorization.
   *
   * Dataset icons are shown only for specific condition types (dataset, genotype)
   * and only at the first level of depth (immediate children of root categories).
   * This helps users visually distinguish between different types of datasets.
   *
   * @param datasetNode - The hierarchical dataset node to check
   * @param conditionType - The type of condition being edited
   * @returns True if a dataset icon should be displayed
   */
  private shouldShowDatasetIcon(
    datasetNode: HierarchyNode<UiNode>,
    conditionType: string
  ): boolean {
    return (
      (conditionType === CONDITION_TYPE.dataset ||
        conditionType === CONDITION_TYPE.genotype) &&
      datasetNode.depth === 1
    );
  }
}
