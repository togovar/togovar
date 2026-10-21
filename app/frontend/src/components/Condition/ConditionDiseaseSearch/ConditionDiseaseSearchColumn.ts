import { LitElement, css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { CSSResultGroup, TemplateResult } from 'lit';

import { repeat } from 'lit/directives/repeat.js';

import { flip } from './flipColumn';

import './ConditionDiseaseSearchOntologyCard';
import type { OntologyNode } from './ConditionDiseaseSearchOntologyCard';

/** ontology-column → 上位への伝播イベントの detail 型 */
type ColumnClickDetail = {
  id: string;
  role: string;
  rect: DOMRect;
};

/**
 * オントロジーカードを縦に並べる1カラム分のスクロールコンテナ。
 * parents / hero / children の3役のいずれかとして OntologyView から使われる。
 */
@customElement('ontology-column')
export class Column extends LitElement {
  static styles: CSSResultGroup = css`
    :host {
      flex-grow: 1;
      flex-basis: 0;
      display: block;
      position: relative;
    }

    .column {
      height: 100%;

      position: relative;
      overflow-y: auto;
      overflow-x: hidden;
    }

    ontology-card:last-child {
      margin-bottom: 10px;
    }
  `;

  /** 描画するノード一覧。外部から .nodes= で注入されるため @state で変化を監視する。 */
  @state() nodes: OntologyNode[] = [];

  /** このカラムの役割（'parents' / 'hero' / 'children'）。flip アニメーションと column-click イベントで使う。 */
  @state() role: string = '';

  /**
   * 現在選択中（hero）のノード ID。
   * flip ディレクティブがアニメーション対象を特定するために必要で、undefined を許容する。
   */
  @state() heroId: string | undefined = undefined;

  /**
   * スクロール後の hero 要素の DOMRect。
   * スクロールとアニメーションを連携させるために flip ディレクティブへ渡す。
   */
  @state() scrolledHeroRect: DOMRect | null = null;

  /**
   * flip アニメーションのタイミング設定。
   * duration や easing など KeyframeAnimationOptions の各値を親から注入できるようにする。
   */
  @state() animationOptions: KeyframeAnimationOptions = {};

  /**
   * カードそのものをクリックしたときだけ column-click を発火する。
   * コネクタ div など子要素のクリックを除外するため tagName で絞り込む。
   */
  private _handleClick(e: Event): void {
    if (!(e.target instanceof Element)) return;
    if (e.target.tagName !== 'ONTOLOGY-CARD') return;

    this.dispatchEvent(
      new CustomEvent<ColumnClickDetail>('column-click', {
        detail: {
          id: (e.target as HTMLElement).id,
          role: this.role,
          rect: e.target.getBoundingClientRect(),
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * ノード配列を repeat で差分描画してアニメーションのコストを最小化する。
   * dummy ノードのみのときはクリックハンドラを外し、意図しない column-click を防ぐ。
   */
  override render(): TemplateResult {
    return html`
      <div
        class="column"
        @click=${this.nodes[0]?.id === 'dummy' ? null : this._handleClick}
      >
        ${this.nodes.length
          ? html`
              ${repeat(
                this.nodes,
                (node) => node.id,
                (node, index) => html`<ontology-card
                  key="${node.id}"
                  id="${node.id}"
                  .data=${node}
                  .mode=${this.role}
                  .prevRect=${this.scrolledHeroRect}
                  .order=${this.nodes.length === 1
                    ? 'single'
                    : index === 0
                      ? 'first'
                      : index === this.nodes.length - 1
                        ? 'last'
                        : 'mid'}
                  ${flip({
                    id: node.id,
                    heroId: this.heroId,
                    role: this.role,
                    scrolledHeroRect: this.scrolledHeroRect,
                    options: this.animationOptions,
                  })}
                />`
              )}
            `
          : nothing}
      </div>
    `;
  }
}

export type { OntologyNode } from './ConditionDiseaseSearchOntologyCard';
