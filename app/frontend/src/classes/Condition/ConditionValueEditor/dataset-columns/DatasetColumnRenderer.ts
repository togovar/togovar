import type { HierarchyNode } from 'd3-hierarchy';
import { createEl } from '../../../../utils/dom/createEl';
import { CONDITION_TYPE } from '../../../../definition';
import { storeManager } from '../../../../store/StoreManager';
import type { UiNode } from './types';

/**
 * Handles DOM generation and rendering for dataset columns
 */
export class DatasetColumnRenderer {
  /**
   * Generates HTML content for a column based on the provided items.
   * @param items - Array of hierarchy nodes to render
   * @param isLogin - Whether the user is logged in
   * @returns HTML string for the column content
   */
  generateColumnList(
    items: HierarchyNode<UiNode>[],
    isLogin: boolean,
    conditionType: string
  ): HTMLUListElement {
    return createEl('ul', {
      children: items.map((item) =>
        this.makeListItemEl(item, isLogin, conditionType)
      ),
    });
  }

  /**
   * Generates HTML for a single list item.
   * @param item - The hierarchy node to render
   * @param isLogin - Whether the user is logged in
   * @returns HTML string for the list item
   */
  makeListItemEl(
    item: HierarchyNode<UiNode>,
    isLogin: boolean,
    conditionType: string
  ): HTMLLIElement {
    const inputId = `checkbox-${item.data.id}`;

    // input or lock
    const inputOrLock = this.shouldShowLockIcon(item, isLogin)
      ? createEl('span', { class: 'lock' })
      : createEl('input', {
          attrs: { type: 'checkbox', id: inputId },
          domProps: { value: item.data.id },
        });

    // dataset アイコン（必要なら）
    const datasetIcon = this.shouldShowDatasetIcon(item, conditionType)
      ? createEl('span', {
          class: 'dataset-icon',
          dataset: item.data.value ? { dataset: item.data.value } : undefined,
        })
      : null;

    // ラベル内のスパン（テキスト）
    const textSpan = createEl('span', { text: item.data.label });

    // <label for=...> の中身
    const labelEl = createEl('label', {
      attrs: { for: inputId },
      children: [inputOrLock, ...(datasetIcon ? [datasetIcon] : []), textSpan],
    });

    // 子がいる時だけ矢印
    const arrow =
      item.children !== undefined
        ? createEl('div', {
            class: 'arrow',
            dataset: {
              id: item.data.id,
              ...(item.data.value ? { value: item.data.value } : {}),
            },
          })
        : null;

    // 最終的な <li>
    return createEl('li', {
      dataset: {
        id: item.data.id,
        parent: item.parent?.data.id ?? '',
        ...(item.data.value ? { value: item.data.value } : {}),
      },
      children: [labelEl, ...(arrow ? [arrow] : [])],
    });
  }

  /**
   * Creates a new column DOM element with appropriate attributes.
   * @returns The created column element
   */
  createColumnElement(columns: HTMLElement): HTMLDivElement {
    const column = document.createElement('div');
    column.classList.add('column');
    column.dataset.depth = columns
      .querySelectorAll(':scope > .column')
      .length.toString();
    return column;
  }

  /**
   * Adds a column prompting the user to login for JGAD datasets.
   */
  async addLoginPromptColumn(columns: HTMLElement): Promise<void> {
    await storeManager.fetchLoginStatus();

    const column = createEl('div', {
      class: 'column',
      dataset: { depth: '2' },
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

    columns.append(column);
  }

  /**
   * Determines if a lock icon should be shown for the item.
   * @param item - The hierarchy node to check
   * @param isLogin - Whether the user is logged in
   * @returns True if lock icon should be shown
   */
  private shouldShowLockIcon(
    item: HierarchyNode<UiNode>,
    isLogin: boolean
  ): boolean {
    return (
      isLogin === false && (item.data.value?.includes('jga_wgs.') ?? false)
    );
  }

  /**
   * Determines if a dataset icon should be shown for the item.
   * @param item - The hierarchy node to check
   * @returns True if dataset icon should be shown
   */
  private shouldShowDatasetIcon(
    item: HierarchyNode<UiNode>,
    conditionType: string
  ): boolean {
    return (
      (conditionType === CONDITION_TYPE.dataset ||
        conditionType === CONDITION_TYPE.genotype) &&
      item.depth === 1
    );
  }
}
