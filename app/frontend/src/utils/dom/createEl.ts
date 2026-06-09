/**
 * createEl に渡せるプロパティの基底型。
 * 同一要素への複数の設定方法（class/attrs/dataset/domProps）を分離することで、
 * 設定の種類ごとに型安全さを維持するため。
 */
type BaseProps<E extends HTMLElement> = {
  /**
   * CSSクラス名。
   * string[] を受け付けることで、条件クラスの動的結合を呼び出し側で書きやすくするため。
   * - string: スペース区切り "btn btn-primary"
   * - string[]: ["btn", "btn-primary"]
   */
  class?: string | ReadonlyArray<string>;

  /**
   * HTML属性（文字列値）。aria-* など属性名をキャメルケースに変換できないものを
   * dataset とは別フィールドで受け取るため。
   */
  attrs?: Record<string, string>;

  /**
   * data-* 属性（dataset経由）。
   * HTMLのdataset APIがキャメルケースを自動変換するため、attrs と分けて専用で管理する。
   */
  dataset?: Record<string, string>;

  /**
   * DOM プロパティへの直接代入（属性ではなくプロパティとして設定する必要があるもの用）。
   * input.value や hidden のようにsetAttributeでは動作しないものを型安全に扱うため。
   */
  domProps?: Partial<E>;

  /**
   * textContent に設定するテキスト。
   * children より先に適用することで、テキストが最初に来る DOM 順序を保証するため。
   */
  text?: string;

  /**
   * 子ノード（Node または string）。
   * string を受け付けることで、呼び出し側で document.createTextNode を書く手間を省くため。
   */
  children?: ReadonlyArray<Node | string>;
};

/**
 * 型安全な DOM 要素生成ヘルパー。
 * document.createElement + classList + setAttribute の繰り返しコードを
 * 1関数にまとめ、生成コードの散在を防ぐため。
 */
export function createEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: BaseProps<HTMLElementTagNameMap[K]> = {}
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag) as HTMLElementTagNameMap[K];

  // 空トークンを除外してから classList に追加する（空文字はDOMExceptionになるため）。
  if (props.class) {
    if (typeof props.class === 'string') {
      const tokens = props.class.trim().split(/\s+/).filter(Boolean);
      if (tokens.length) el.classList.add(...tokens);
    } else {
      const tokens = props.class.filter(Boolean);
      if (tokens.length) el.classList.add(...tokens);
    }
  }

  if (props.attrs) {
    for (const [k, v] of Object.entries(props.attrs)) {
      el.setAttribute(k, v);
    }
  }

  if (props.dataset) {
    for (const [k, v] of Object.entries(props.dataset)) {
      (el.dataset as DOMStringMap)[k] = v;
    }
  }

  // Object.assign で DOM プロパティへ一括代入する。
  if (props.domProps) Object.assign(el, props.domProps);

  // text は children より先に設定して順序を固定する。
  if (props.text != null) {
    el.textContent = props.text;
  }

  if (props.children) {
    for (const c of props.children) {
      el.appendChild(
        c instanceof Node ? c : document.createTextNode(String(c))
      );
    }
  }

  return el;
}
