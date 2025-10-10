export type QueryRoot = Document | DocumentFragment | Element; // ShadowRoot included

/** Returns required element; throws if not found (fail fast on template regressions). */
export function selectRequired<T extends Element>(
  root: QueryRoot,
  selector: string,
  where: string = 'unknown'
): T {
  const el = root.querySelector(selector);
  if (!el) throw new Error(`selector not found: ${selector} (in ${where})`);
  return el as T;
}

/** Returns element or null (use when optional). */
export function selectOrNull<T extends Element>(
  root: QueryRoot,
  selector: string
): T | null {
  return root.querySelector(selector) as T | null;
}
