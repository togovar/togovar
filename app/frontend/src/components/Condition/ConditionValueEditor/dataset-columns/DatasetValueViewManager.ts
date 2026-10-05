import type { HierarchyNode } from 'd3-hierarchy';
import type { UiNode } from './types';

/**
 * 選択済みデータセットの値ビュー表示を最適化する。
 *
 * 子が全選択されている場合に親だけを表示することで、
 * 値ビューが冗長なエントリで溢れることを防ぐ。
 */
export class DatasetValueViewManager {
  /**
   * 最も簡潔な表示になるノード集合を返す。
   *
   * 「全子選択かつ親がvalue持ち」なら親だけを返す。
   * これにより "Genomic Studies" を選んだとき、配下の個別データセット名が
   * 並列に並ぶのを防いで視認性を保つ。
   */
  getOptimalNodesToShow(
    currentNode: HierarchyNode<UiNode>
  ): HierarchyNode<UiNode>[] {
    if (!currentNode.children) {
      return currentNode.data.checked ? [currentNode] : [];
    }

    const allChildrenAreSelected = currentNode.children.every(
      (childNode) => childNode.data.checked
    );

    if (allChildrenAreSelected && currentNode.data.value) {
      return [currentNode];
    }

    return currentNode.children.flatMap((childNode) =>
      this.getOptimalNodesToShow(childNode)
    );
  }

  /**
   * ルートからノードまでのパスをラベルで結合して返す。
   *
   * 同名のデータセットが別カテゴリに存在する場合でも
   * "Genomic Studies > WGS > Dataset A" のようにコンテキストを示せる。
   */
  getLabelWithPath(
    selectedNode: HierarchyNode<UiNode>,
    datasetTreeRoot: HierarchyNode<UiNode>
  ): string {
    const fullPathNodes = selectedNode.path(datasetTreeRoot).reverse();
    // 先頭は仮想ルートなので除外する。
    const [, ...meaningfulPathNodes] = fullPathNodes;
    return meaningfulPathNodes
      .map((pathNode) => pathNode.data.label)
      .join(' > ');
  }
}
