import { LitElement, html, css } from 'lit';

export class OntologyCard extends LitElement {
  static get properties() {
    return {
      data: { type: Object, attribute: true },
      selected: { type: Boolean, attribute: true },
      id: { type: String, attribute: true },
    };
  }

  static styles = css`
    .ontology-card {
      width: 20rem;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 5px;
      background-color: #fff;
      cursor: pointer;
      box-shadow: 0px 3px 6px rgba(0, 0, 0, 0.16);
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
    this._skipKeys = ['label', 'children', 'parents', 'leaf'];
  }

  _handleClick() {
    this.selected = true;
    this.dispatchEvent(
      new CustomEvent('card_selected', { detail: { id: this.data.id } })
    );
  }

  render() {
    return html`
      <div
        class="ontology-card ${this.selected ? 'selected' : ''}"
        @click="${this._handleClick}"
      >
        <div class="ontology-card-header">
          <h3>${this.data ? this.data.label : '...'}</h3>
          ${this.selected
            ? html`
                <table>
                  <tbody>
                    ${Object.keys(this.data)
                      .filter((key) => !this._skipKeys.includes(key))
                      .map((key) => {
                        return html`
                          <tr>
                            <td class="key">${key}</td>
                            <td class="data">${this.data[key]}</td>
                          </tr>
                        `;
                      })}
                  </tbody>
                </table>
              `
            : null}
        </div>
      </div>
    `;
  }
}

customElements.define('ontology-card', OntologyCard);
