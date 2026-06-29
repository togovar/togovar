import type { HierarchyNode } from 'd3-hierarchy';
import type { UiNode } from './types';

/**
 * カラムインターフェースのユーザー操作イベントを管理する。
 *
 * イベント処理を親クラスから分離し、状態更新とUI描画の責務を
 * コールバック経由で親クラスへ委ねることでテスト容易性を確保する。
 */
export class DatasetColumnEventHandler {
  /**
   * カラム要素にcheckboxのchangeイベントを委譲登録する。
   *
   * 各リストアイテムに個別リスナーを付けると、カラム追加のたびに付け直しが必要になる。
   * カラム要素への委譲にすることでカラム生成後に一度だけ呼べばよくなる。
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
      isSelected?: boolean
    ) => void,
    refreshUserInterface: () => void
  ): void {
    columnElement.addEventListener('change', (event) => {
      const clickedCheckbox = event.target as HTMLInputElement;
      const listItemElement = clickedCheckbox.closest('li');
      if (!listItemElement || !listItemElement.dataset.id) return;

      const datasetId = listItemElement.dataset.id;
      const clickedDatasetNode = datasetTree.find(
        (datum) => datum.data.id === datasetId
      );
      if (!clickedDatasetNode) return;

      const nextSelectionState = this.getNextSelectionState(
        clickedDatasetNode,
        clickedCheckbox
      );

      if (clickedDatasetNode.children) {
        propagateToChildren(clickedDatasetNode, nextSelectionState);
        updateParentStates(clickedDatasetNode);
      } else if (clickedDatasetNode.parent) {
        updateParentStates(clickedDatasetNode, nextSelectionState);
      }

      refreshUserInterface();
    });
  }

  /**
   * ロックされた子を含む親はindeterminateになり得るため、親だけはDOMではなくデータ状態から次の選択を決める。
   */
  private getNextSelectionState(
    clickedDatasetNode: HierarchyNode<UiNode>,
    clickedCheckbox: HTMLInputElement
  ): boolean {
    if (!clickedDatasetNode.children) {
      return clickedCheckbox.checked;
    }

    return !(
      clickedDatasetNode.data.checked || clickedDatasetNode.data.indeterminate
    );
  }

  /** カラムのarrow要素にクリックリスナーを登録する。 */
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
   * 別カテゴリへ移動する際に選択ハイライトと子カラムを削除する。
   *
   * depth属性で現在より深いカラムだけを削除することで、
   * 戻る操作時に上位カラムを再生成せずに済む。
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

    const parentListContainer = clickedListItem.parentNode as Element;
    if (parentListContainer) {
      parentListContainer
        .querySelector(':scope > .-selected')
        ?.classList.remove('-selected');
    }

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
