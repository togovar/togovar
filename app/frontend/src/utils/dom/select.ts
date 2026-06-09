// ShadowRoot は DocumentFragment を継承するため、DocumentFragment を含めることで検索ルートとして扱える。
export type QueryRoot = Document | DocumentFragment | Element;

/**
 * 必須要素を取得する。見つからない場合は即座に例外を投げる。
 * 任意要素としてnullを返すのではなく失敗させることで、テンプレート崩れを早期に検出するため。
 */
export function selectRequired<T extends Element>(
  root: QueryRoot,
  selector: string,
  where: string = 'unknown'
): T {
  const el = root.querySelector(selector);
  if (!el) throw new Error(`selector not found: ${selector} (in ${where})`);
  return el as T;
}

/**
 * 省略可能な要素を取得する。存在しない場合はnullを返す。
 * nullチェックの責任を呼び出し側に委ね、「存在しなくてよい」意図を型で明示するため。
 */
export function selectOrNull<T extends Element>(
  root: QueryRoot,
  selector: string
): T | null {
  return root.querySelector(selector) as T | null;
}
