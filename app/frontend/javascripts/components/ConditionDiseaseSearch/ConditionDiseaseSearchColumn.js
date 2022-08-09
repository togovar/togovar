import { LitElement, css, html } from 'lit';

import { repeat } from 'lit/directives/repeat.js';
import { flipColumn } from './flipColumn';

import './OntologyCard';

export default class CondDiseaseColumn extends LitElement {
  static styles = css`
    .column {
      display: block;
      height: 200px;
      width: 100px
      background-color: #333;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
    }
  `;
  static get properties() {
    return {
      nodes: { type: Array, state: true },
    };
  }
  constructor() {
    super();
    this.nodes = [];
  }

  render() {
    const options = {
      duration: 5000,
      timingFunction: 'ease-out', // 'steps(5, end)'
    };

    console.log(this.nodes);

    return html`
      <div class="column">
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
                    ${flipColumn({ duration: 1000 }, () => {})}
                    selected
                  />`;
                }
              )}
            `
          : html``}
      </div>
    `;
  }
}

customElements.define('ontology-column', CondDiseaseColumn);
