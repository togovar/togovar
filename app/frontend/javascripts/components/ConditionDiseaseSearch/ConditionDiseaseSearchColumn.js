import { LitElement, css, html, nothing } from 'lit';

import { repeat } from 'lit/directives/repeat.js';

import { flip } from './flipColumn';

import './ConditionDiseaseSearchOntologyCard';

export default class Column extends LitElement {
  static styles = css`
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

  static get properties() {
    return {
      nodes: { type: Array, state: true },
      role: { type: String, state: true },
      heroId: {
        type: String,
        state: true,
      },
      scrolledHeroRect: { type: Object, state: true },
      animationOptions: { type: Object, state: true },
    };
  }
  constructor() {
    super();
    this.nodes = [];
    this.heroId = undefined;
    this.role = '';
    this.scrolledHeroRect = null;
    this.animationOptions = {};
  }

  _handleClick(e) {
    if (e.target.tagName === 'ONTOLOGY-CARD') {
      // only if clicked on the card itself, not on connector div
      if (!e.path[0].classList.contains('connector')) {
        // dispatch event to load new data by id
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
  }

  render() {
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
                      options: this.animationOptions,
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
