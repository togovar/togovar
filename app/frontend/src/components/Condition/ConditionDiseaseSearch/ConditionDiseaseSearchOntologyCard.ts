import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ref, createRef } from 'lit/directives/ref.js';
import type { CSSResultGroup, PropertyValues, TemplateResult } from 'lit';
import type { Ref } from 'lit/directives/ref.js';

/**
 * データベース識別子を画面上の名称とリンクプレフィックスに変換するマップ。
 * id (MONDO) / cui (MedGen) のみ外部リンクを持つため、このマップに登録したキーだけ行を表示する。
 */
const KEYS_MAP: Record<string, { text: string; link: string }> = {
  id: {
    text: 'MONDO',
    link: 'http://purl.obolibrary.org/obo/',
  },
  cui: {
    text: 'MedGen',
    link: 'https://www.ncbi.nlm.nih.gov/medgen/',
  },
};

/**
 * オントロジーカードが扱うノードデータ型。
 * id は必須、leaf / root はツリー末端・根を示す位置フラグ。
 * KEYS_MAP に対応するデータベース識別子（cui など）を index signature で受け入れる。
 */
export type OntologyNode = {
  id: string;
  label?: string;
  leaf?: boolean;
  root?: boolean;
  children?: OntologyNode[];
  parents?: OntologyNode[];
  cui?: string;
  [key: string]: unknown;
};

/** 矩形サイズ情報の最小型。DOMRect はこの型の構造的部分集合なのでそのまま渡せる。 */
type CardRect = { x: number; y: number; width: number; height: number };

/**
 * オントロジーツリーの1ノードを表示するカード。
 * hero / parents / children の3モードでコネクタ線の向きとアニメーションが変わる。
 * hero モードのときだけ詳細テーブル（MONDO / MedGen リンク）を展開する。
 */
@customElement('ontology-card')
export class OntologyCard extends LitElement {
  static styles: CSSResultGroup = css`
    :host {
      display: block;
      position: relative;
      --connector-line: 1px solid #ccc;
      --selected-bg-color: white;
      --default-bg-color: white;
      --selected-border-color: rgb(17, 127, 147);
    }

    .-hero-right:before {
      position: absolute;
      z-index: 9;
      content: '';
      width: 100%;
      height: 1px;
      border-bottom: var(--connector-line);
      top: min(50%, 15px);
      box-sizing: border-box;
    }

    .-hero-left:before {
      position: absolute;
      z-index: 9;
      content: '';
      width: 100%;
      height: 1px;
      border-bottom: var(--connector-line);
      top: min(50%, 15px);
      box-sizing: border-box;
    }

    .-children-first:before {
      position: absolute;
      z-index: 9;
      content: '';
      width: 1px;
      height: calc(100% - min(50%, 15px) + 5px);
      border-left: var(--connector-line);
      bottom: -6px;
      box-sizing: border-box;
    }

    .-children-first:after {
      position: absolute;
      z-index: 9;
      content: '';
      width: 100%;
      height: 1px;
      border-bottom: var(--connector-line);
      top: min(50%, 15px);
      box-sizing: border-box;
    }

    .-children-last:before {
      position: absolute;
      z-index: 9;
      content: '';
      width: 1px;
      height: calc(min(50%, 15px) + 6px);
      border-left: var(--connector-line);
      top: -6px;
      box-sizing: border-box;
    }

    .-children-last:after {
      position: absolute;
      z-index: 9;
      content: '';
      width: 100%;
      height: 1px;
      border-top: var(--connector-line);
      top: min(50%, 15px);
      box-sizing: border-box;
    }

    .-children-mid:before {
      position: absolute;
      z-index: 9;
      content: '';
      width: 1px;
      height: calc(100% + 14px);
      border-left: var(--connector-line);
      top: -6px;
      box-sizing: border-box;
    }

    .-children-mid:after {
      position: absolute;
      z-index: 9;
      content: '';
      width: 100%;
      height: 1px;
      border-bottom: var(--connector-line);
      top: min(50%, 15px);
      box-sizing: border-box;
    }

    .-parents-first:before {
      position: absolute;
      z-index: 9;
      content: '';
      width: 1px;
      height: calc(100% - min(50%, 15px) + 5px);
      border-right: var(--connector-line);
      bottom: -6px;
      right: 0;
      box-sizing: border-box;
    }

    .-parents-first:after {
      position: absolute;
      z-index: 9;
      content: '';
      width: 100%;
      height: 1px;
      border-bottom: var(--connector-line);
      top: min(50%, 15px);
      box-sizing: border-box;
    }

    .-parents-last:before {
      position: absolute;
      z-index: 9;
      content: '';
      width: 1px;
      height: calc(min(50%, 15px) + 6px);
      border-right: var(--connector-line);
      top: -6px;
      right: 0;
      box-sizing: border-box;
    }

    .-parents-last:after {
      position: absolute;
      z-index: 9;
      content: '';
      width: 100%;
      height: 1px;
      border-top: var(--connector-line);
      top: min(50%, 15px);
      box-sizing: border-box;
    }

    .-parents-mid:before {
      position: absolute;
      z-index: 9;
      content: '';
      width: 1px;
      height: calc(100% + 14px);
      border-right: var(--connector-line);
      top: -6px;
      right: 0;
      box-sizing: border-box;
    }

    .-parents-mid:after {
      position: absolute;
      z-index: 9;
      content: '';
      width: 100%;
      height: 1px;
      border-bottom: var(--connector-line);
      top: min(50%, 15px);
      box-sizing: border-box;
    }

    .-parents-single:after {
      position: absolute;
      z-index: 9;
      content: '';
      width: 100%;
      height: 1px;
      border-bottom: var(--connector-line);
      top: min(50%, 15px);
      box-sizing: border-box;
    }

    .-children-single:before {
      position: absolute;
      z-index: 9;
      content: '';
      width: 100%;
      height: 1px;
      border-bottom: var(--connector-line);
      top: min(50%, 15px);
      box-sizing: border-box;
    }

    .ontology-card {
      padding: 6px;
      border: 1px solid #ccc;
      border-radius: 8px;
      background-color: #fff;
      cursor: pointer;
      position: relative;
      width: min(80%, 20rem);
      max-width: 30rem;
      box-sizing: border-box;
      margin-bottom: 6px;
    }

    .ontology-card:hover {
      filter: brightness(0.98);
    }

    h3 {
      display: inline-block;
      text-transform: lowercase;
      margin-top: 0;
      margin-bottom: 0;
    }

    h3:first-letter {
      text-transform: uppercase;
    }

    .card-container {
      display: flex;
      flex-direction: row;
      justify-content: center;
    }

    .hyper-text {
      color: var(--color-key-dark3);
      text-decoration: underline;
    }

    .hyper-text:active,
    .hyper-text:hover {
      color: var(--color-key-dark1);
    }

    .connector {
      position: relative;
      flex-grow: 1;
    }

    .selected {
      background-color: var(--selected-bg-color);
      border-color: var(--selected-border-color);
    }

    .hidden {
      visibility: hidden;
    }

    .table-container {
      max-height: 10rem;
      margin-top: 0.3em;
      overflow-y: auto;
    }
  `;

  /**
   * ノードデータ。外部から .data=${node} でバインドされる。
   * state にして属性観察を省略するのは、JSONオブジェクトを属性値で渡すのが不適切なため。
   */
  @state() data: OntologyNode = { id: '' };

  /**
   * hidden は HTMLElement の組み込み属性で display:none を制御する。
   * dummy ノードを非表示にするためにネイティブ属性と同期させる。
   */
  @property({ type: Boolean, attribute: true }) override hidden: boolean = false;

  /**
   * id は HTMLElement の組み込み属性。カラムクリック時のノード識別と flip アニメーションで参照するため
   * reflect: true にして DOM 属性に同期させる。
   */
  @property({ type: String, attribute: true, reflect: true }) override id: string = '';

  /** hero / parents / children のいずれか。コネクタ線の向きとアニメーションの有無を決める。 */
  @state() mode: string = '';

  /**
   * カラム内での位置（first / last / mid / single）。
   * 上下どちらにコネクタ線を伸ばすかを決めるために必要。
   */
  @state() order: string = '';

  /**
   * スクロール前の hero 要素の矩形情報。
   * FLIP アニメーションの起点座標として updated() に渡す。
   */
  @state() prevRect: CardRect | null = { x: 0, y: 0, width: 0, height: 0 };

  /** カード要素への参照。getBoundingClientRect と animate を呼ぶため HTMLElement として型付けする。 */
  private readonly cardRef: Ref<HTMLElement> = createRef<HTMLElement>();

  /**
   * カード描画に不要なノードのキーを除外するリスト。
   * label / children / parents / leaf / root は表示しない（ツリー構造用メタデータのため）。
   */
  private readonly _skipKeys: readonly string[] = ['label', 'children', 'parents', 'leaf', 'root'];

  /** left コネクタに付与する CSS クラス名。willUpdate で毎回算出する。 */
  private leftConnectorClassName: string = '';

  /** right コネクタに付与する CSS クラス名。willUpdate で毎回算出する。 */
  private rightConnectorClassName: string = '';

  /**
   * hero モード選択時のカード背景色。firstUpdated で CSS 変数から取得し updated のアニメーションで使う。
   * CSS カスタムプロパティの値は getComputedStyle でしか取れないため、フィールドにキャッシュする。
   */
  private defaultBgColor: string = '';

  /** 選択中（hero）のカード背景色。CSS 変数から取得しアニメーションのターゲット値に使う。 */
  private selectedBgColor: string = '';

  /**
   * dummy ノード（プレースホルダー）を hidden にして DOM から視覚的に除外する。
   * Lit がプロパティ変化なしでも shouldUpdate を呼ぶため、ここで hidden を制御する。
   */
  override shouldUpdate(_changedProperties: PropertyValues<this>): boolean {
    this.hidden = this.data.id === 'dummy';
    return true;
  }

  /**
   * レンダリング前にコネクタクラス名を算出する。
   * render() 内で毎回条件分岐を書くより willUpdate にまとめることで render を宣言的に保つ。
   */
  override willUpdate(_changedProperties: PropertyValues<this>): void {
    this.leftConnectorClassName = '';
    this.rightConnectorClassName = '';

    if (this.data.id === 'dummy') return;

    if (this.mode === 'hero') {
      if (this.data.leaf) {
        this.leftConnectorClassName = '-hero-left';
      } else if (this.data.root) {
        this.rightConnectorClassName = '-hero-right';
      } else {
        this.leftConnectorClassName = '-hero-left';
        this.rightConnectorClassName = '-hero-right';
      }
    } else if (this.mode === 'children') {
      this.leftConnectorClassName = `-${this.mode}-${this.order}`;
    } else if (this.mode === 'parents') {
      this.rightConnectorClassName = `-${this.mode}-${this.order}`;
    }
  }

  /**
   * hero モード切り替え時にカードの高さと背景色を FLIP アニメーションで補間する。
   * hero 以外はアニメーション不要なため mode === 'hero' のときだけ animate を呼ぶ。
   */
  override updated(_changedProperties: PropertyValues<this>): void {
    if (this.mode !== 'hero' || !this.cardRef.value) return;

    const animation: Keyframe[] = [
      {
        height: `${this.prevRect?.height ?? 0}px`,
        overflow: 'hidden',
        backgroundColor: this.defaultBgColor,
      },
      {
        height: `${this.cardRef.value.getBoundingClientRect().height}px`,
        backgroundColor: this.selectedBgColor,
      },
    ];

    this.cardRef.value.animate(animation, { duration: 500, easing: 'ease-out' });
  }

  /**
   * CSS カスタムプロパティの実効値を最初のレンダリング後に取得してキャッシュする。
   * getComputedStyle は DOM 接続後にしか正しい値を返さないため firstUpdated で取得する。
   */
  override firstUpdated(_changedProperties: PropertyValues<this>): void {
    if (!this.cardRef.value) return;
    const style = getComputedStyle(this.cardRef.value);
    this.defaultBgColor = style.getPropertyValue('--default-bg-color');
    this.selectedBgColor = style.getPropertyValue('--selected-bg-color');
  }

  /**
   * カード本体とその左右コネクタ、hero モード時の詳細テーブルを描画する。
   * KEYS_MAP に登録されたキーのみリンク行として表示し、未知のキーは無視する。
   */
  override render(): TemplateResult {
    return html`
      <div class="card-container">
        <div class="connector ${this.leftConnectorClassName}"></div>
        <div
          ${ref(this.cardRef)}
          class="ontology-card ${this.hidden ? 'hidden' : ''} ${this.mode === 'hero' ? 'selected' : ''}"
        >
          <div class="ontology-card-header">
            <h3>${this.data?.label ?? '...'}</h3>
            ${this.mode === 'hero'
              ? html`
                  <div class="table-container">
                    <table>
                      <tbody>
                        ${Object.keys(this.data)
                          .filter((key) => !this._skipKeys.includes(key) && key in KEYS_MAP)
                          .map(
                            (key) => html`
                              <tr>
                                <td class="key">${KEYS_MAP[key].text}:</td>
                                <td class="data">
                                  <a
                                    class="hyper-text -external"
                                    href="${KEYS_MAP[key].link}${String(this.data[key])}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    >${String(this.data[key])}</a
                                  >
                                </td>
                              </tr>
                            `
                          )}
                      </tbody>
                    </table>
                  </div>
                `
              : nothing}
          </div>
        </div>
        <div class="connector ${this.rightConnectorClassName}"></div>
      </div>
    `;
  }
}
