import { LitElement, html, css } from 'lit';

export class OntologyCard extends LitElement {
  static get properties() {
    return {
      data: { type: Object, attribute: true },
      selected: { type: Boolean, attribute: true },
    };
  }

  static styles = css`
    .ontology-card {
      width: 20rem;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 5px;
      background-color: #fff;
    }
    .selected {
      background-color: #f0f0f0;
      border-color: rgb(17, 127, 147);
    }
  `;

  constructor() {
    super();
    this.data = {};
    this.selected = false;
  }

  render() {
    return html`
      <div class="ontology-card ${this.selected ? 'selected' : ''}">
        <div class="ontology-card-header">
          <h3>${this.data ? this.data.label : '...'}</h3>
        </div>
      </div>
    `;
  }
}

customElements.define('ontology-card', OntologyCard);
