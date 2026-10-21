import type { HierarchyNode } from 'd3-hierarchy';
import type { UiNode } from './types';
import { isDatasetLockedForAnonymousUser } from './datasetAccess';

/**
 * チェックボックス選択状態の親子間整合性を管理する。
 *
 * 親→子への伝播と子→親への集計を分離することで、
 * ConditionValueEditorDatasetColumns が呼び出し順序を制御できるようにする。
 */
export class DatasetCheckStateManager {
  /** 親ノードのチェック状態を全子孫へ伝播させる。 */
  updateChildrenCheckState(
    parentNode: HierarchyNode<UiNode>,
    isSelected: boolean,
    userIsLoggedIn: boolean
  ): void {
    if (!parentNode.children || parentNode.children.length === 0) return;

    parentNode.descendants().forEach((descendant) => {
      if (isDatasetLockedForAnonymousUser(descendant.data, userIsLoggedIn)) {
        descendant.data.checked = false;
        descendant.data.indeterminate = false;
        return;
      }

      descendant.data.checked = isSelected;
      descendant.data.indeterminate = false;
    });
  }

  /**
   * 子ノードの変更を親チェーンへ再帰的に反映する。
   *
   * explicitSelectionState を渡す場合はその値を直接セットし（leaf→parent の起点）、
   * 省略した場合は子の状態から計算する（再帰時の上位ノード更新）。
   */
  updateParentCheckState(
    childNode: HierarchyNode<UiNode> | undefined,
    explicitSelectionState?: boolean
  ): void {
    if (!childNode) return;

    if (typeof explicitSelectionState === 'boolean') {
      childNode.data.checked = explicitSelectionState;
      childNode.data.indeterminate = false;
    } else {
      this._calculateParentStateFromChildren(childNode);
    }

    this.updateParentCheckState(childNode.parent || undefined);
  }

  /**
   * 子の選択状況から親の三値状態（checked / indeterminate / unchecked）を決める。
   *
   * 全子がcheckedかつindeterminateなしのときのみcheckedとし、
   * 部分選択やindeterminate子がある場合はindeterminateとする。
   */
  private _calculateParentStateFromChildren(
    parentNode: HierarchyNode<UiNode>
  ): void {
    if (!parentNode.children) return;

    const fullySelectedChildren = parentNode.children.filter(
      (child) => child.data.checked
    );
    const partiallySelectedChildren = parentNode.children.filter(
      (child) => child.data.indeterminate
    );

    const allChildrenSelected =
      fullySelectedChildren.length === parentNode.children.length;
    const someChildrenSelected = fullySelectedChildren.length > 0;
    const hasPartiallySelectedChildren = partiallySelectedChildren.length > 0;

    parentNode.data.checked =
      allChildrenSelected && !hasPartiallySelectedChildren;
    parentNode.data.indeterminate =
      (someChildrenSelected && !allChildrenSelected) ||
      hasPartiallySelectedChildren;
  }

  /** データモデルの状態をDOM checkboxへ一括反映する。 */
  updateCheckboxStatesInDOM(
    columnsContainer: HTMLElement,
    datasetTree: HierarchyNode<UiNode>
  ): void {
    datasetTree.eachAfter((datasetNode) => {
      const checkboxElement = columnsContainer.querySelector(
        `li[data-id="${datasetNode.data.id}"] > label > input`
      ) as HTMLInputElement;

      if (checkboxElement) {
        checkboxElement.checked =
          !datasetNode.data.indeterminate && datasetNode.data.checked;
        checkboxElement.indeterminate =
          !datasetNode.data.checked &&
          (datasetNode.data.indeterminate || false);
      }
    });
  }
}
