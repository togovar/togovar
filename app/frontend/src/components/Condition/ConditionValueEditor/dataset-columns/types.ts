export type UiNode = {
  id: string;
  label: string;
  value?: string;
  children?: UiNode[];
  checked: boolean;
  // checkedとindeterminateを分けて管理することで、DOMのindeterminateプロパティへ直接マッピングできる。
  indeterminate?: boolean;
};

// 複数のルートカテゴリを単一ツリーとして扱うための仮想ルート識別子。
// d3のtree traversal APIが単一エントリポイントを前提とするためUIには表示しない。
export const ROOT_NODE_ID = 'synthetic-root';
