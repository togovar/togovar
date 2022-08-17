import { LitElement, css, html, nothing } from 'lit';

import { repeat } from 'lit/directives/repeat.js';

import { flip } from './flipColumn';

import './OntologyCard';

const rects = new Map();

export default class Column extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    .column {
      display: flex;
      height: 100%;
      flex-direction: column;
      justify-content: flex-start;
      align-items: flex-start;
      gap: 10px;
      position: relative;
      overflow-y: auto;
    }
  `;

  static get properties() {
    return {
      nodes: { type: Array, state: true },
      role: { type: String, attribute: true, reflect: true },
    };
  }
  constructor(role) {
    super(...arguments);
    this.nodes = [];
    this.role = role || '';
  }

  _handleClick(e) {
    if (e.target.tagName === 'ONTOLOGY-CARD') {
      this.dispatchEvent(
        new CustomEvent('column-click', {
          detail: {
            id: e.target.id,
            role: this.role,
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
                (node) => {
                  return html`<ontology-card
                    key="${node.id}"
                    id="${node.id}"
                    .data=${node}
                    ${flip({ id: node.id, role: this.role, options })}
                    selected
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
