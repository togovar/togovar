/** Base props for element creation. */
type BaseProps<E extends HTMLElement> = {
  /** CSS class names.
   *  - string: whitespace-separated, e.g. "btn btn-primary"
   *  - string[]: ["btn", "btn-primary"] (handy for conditional classes)
   */
  class?: string | ReadonlyArray<string>;

  /** Plain HTML attributes (string values), e.g. id, type, role, aria-*. */
  attrs?: Record<string, string>;

  /** data-* attributes via dataset (camelCase -> data-). */
  dataset?: Record<string, string>;

  /** Direct assignment to DOM properties (NOT attributes),
   *  typed to the concrete element (e.g. input.value, img.src, a.href,
   *  hidden/tabIndex/spellcheck as booleans/numbers). */
  domProps?: Partial<E>;

  /** Sets textContent (inserted before children). */
  text?: string;

  /** Ordered children: Nodes or strings (strings become Text nodes). */
  children?: ReadonlyArray<Node | string>;
};

export function createEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: BaseProps<HTMLElementTagNameMap[K]> = {}
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag) as HTMLElementTagNameMap[K];

  // classes (string or string[])
  if (props.class) {
    if (typeof props.class === 'string') {
      const tokens = props.class.trim().split(/\s+/).filter(Boolean);
      if (tokens.length) el.classList.add(...tokens);
    } else {
      const tokens = props.class.filter(Boolean);
      if (tokens.length) el.classList.add(...tokens);
    }
  }

  //  attributes (string values)
  if (props.attrs) {
    for (const [k, v] of Object.entries(props.attrs)) {
      el.setAttribute(k, v);
    }
  }

  //  dataset -> data-*
  if (props.dataset) {
    for (const [k, v] of Object.entries(props.dataset)) {
      (el.dataset as DOMStringMap)[k] = v;
    }
  }

  // strongly-typed DOM properties (element-specific)
  if (props.domProps) Object.assign(el, props.domProps);

  //  text first, then children
  if (props.text != null) {
    el.textContent = props.text;
  }

  // children in order (Node or string)
  if (props.children) {
    for (const c of props.children) {
      el.appendChild(
        c instanceof Node ? c : document.createTextNode(String(c))
      );
    }
  }

  return el;
}
