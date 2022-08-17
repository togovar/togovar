import { LitElement, html, css } from 'lit';

export class OntologyCard extends LitElement {
  static properties() {
    return {
      data: { type: Object, state: true },
      selected: { type: Boolean, attribute: true },
      hidden: { type: Boolean, attribute: true },
      id: { type: String, attribute: true, reflect: true },
      mode: {
        type: String,
        state: true,
      },
    };
  }

  shouldUpdate() {
    if (this.data.id === 'dummy') {
      this.hidden = true;
    } else {
      this.hidden = false;
    }
    return true;
  }

  constructor() {
    super();
    this.data = {};
    this.hidden = false;
    this.selected = false;
    this.mode = '';
    this._skipKeys = ['label', 'children', 'parents', 'leaf'];
  }

  static styles = css`
    :host {
      display: block;
    }

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

    .hidden {
      visibility: hidden;
    }
  `;

  render() {
    return html`
      <div
        class="ontology-card ${this.selected ? 'selected' : ''} ${this.hidden
          ? 'hidden'
          : ''}"
      >
        <div class="ontology-card-header">
          <h3>${this.data?.label || '...'}</h3>
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
