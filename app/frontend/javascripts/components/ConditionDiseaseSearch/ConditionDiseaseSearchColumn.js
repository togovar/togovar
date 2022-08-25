import { LitElement, css, html, nothing } from 'lit';

import { repeat } from 'lit/directives/repeat.js';

import { flip } from './flipColumn';

import './OntologyCard';

export default class Column extends LitElement {
  static styles = css`
    :host {
      flex-grow: 1;
      flex-basis: 0;
      display: block;
      position: relative;
    }

    .column {
      display: flex;
      height: 100%;
      flex-direction: column;
      gap: 6px;
      position: relative;
      overflow-y: auto;
      overflow-x: hidden;
    }

    ontology-card:last-child {
      margin-bottom: 10px;
    }
  `;

  static get properties() {
    return {
      nodes: { type: Array, state: true },
      role: { type: String, state: true },
      heroId: {
        type: String,
        state: true,
      },
      scrolledHeroRect: { type: Object, state: true },
    };
  }
  constructor() {
    super(...arguments);
    this.nodes = [];
    this.heroId = undefined;
    this.role = '';
    this.scrolledHeroRect = null;
  }

  _handleClick(e) {
    if (e.target.tagName === 'ONTOLOGY-CARD') {
      this.dispatchEvent(
        new CustomEvent('column-click', {
          detail: {
            id: e.target.id,
            role: this.role,
            rect: e.target.getBoundingClientRect(),
          },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  render() {
    const options = {
      duration: 5000,
      timingFunction: 'ease-out', // 'steps(5, end)'
    };

    return html`
      <div
        class="column"
        @click="${this.nodes[0].id === 'dummy' ? null : this._handleClick}"
      >
        ${this.nodes.length
          ? html`
              ${repeat(
                this.nodes,
                (node) => node.id,
                (node, index) => {
                  return html`<ontology-card
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
                      options,
                    })}
                  />`;
                }
              )}
            `
          : nothing}
      </div>
    `;
  }
}

customElements.define('ontology-column', Column);
