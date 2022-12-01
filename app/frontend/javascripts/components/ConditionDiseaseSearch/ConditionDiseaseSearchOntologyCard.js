import { LitElement, html, css, nothing } from 'lit';
import { ref, createRef } from 'lit/directives/ref.js';

const KEYS_MAP = {
  id: {
    text: 'MONDO',
    link: 'http://purl.obolibrary.org/obo/',
  },
  cui: {
    text: 'MedGen',
    link: 'https://www.ncbi.nlm.nih.gov/medgen/',
  },
};

export class OntologyCard extends LitElement {
  static get properties() {
    return {
      data: { type: Object, state: true },
      hidden: { type: Boolean, attribute: true },
      id: { type: String, attribute: true, reflect: true },
      mode: {
        type: String,
        state: true,
      },
      order: {
        type: String,
        state: true,
      },
      prevRect: {
        type: Object,
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
    this.mode = '';
    this.order = '';
    this.prevRect = { x: 0, y: 0, width: 0, height: 0 };
    this._skipKeys = ['label', 'children', 'parents', 'leaf', 'root'];
    this.cardRef = createRef();
    this._leftCoinnector = createRef;
    this.leftConnectorClassName = '';
    this.rightConnectorClassName = '';
  }

  static styles = css`
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

  willUpdate(prevParams) {
    if (this.mode === 'hero') {
      if (this.data.leaf) {
        this.leftConnectorClassName = '-hero-left';
      } else if (this.data.root) {
        this.rightConnectorClassName = '-hero-right';
      } else {
        this.leftConnectorClassName = `-hero-left`;
        this.rightConnectorClassName = `-hero-right`;
      }
    } else if (this.mode === 'children') {
      this.leftConnectorClassName = `-${this.mode}-${this.order}`;
    } else if (this.mode === 'parents') {
      this.rightConnectorClassName = `-${this.mode}-${this.order}`;
    }

    this.prevMode = prevParams.get('mode');
    if (this.data.id === 'dummy') {
      this.leftConnectorClassName = '';
      this.rightConnectorClassName = '';
    }
  }

  updated() {
    const animProps = {
      duration: 500,
      easing: 'ease-out',
    };

    if (this.mode === 'hero') {
      let animation = [
        {
          height: `${this.prevRect?.height || 0}px`,
          overflow: 'hidden',
        },
        {
          height: `${
            this.cardRef?.value.getBoundingClientRect().height || 0
          }px`,
        },
      ];

      animation[0].backgroundColor = this.defaultBgColor;
      animation[1].backgroundColor = this.selectedBgColor;

      this.cardRef.value.animate(animation, animProps);
    }
  }

  firstUpdated() {
    this.defaultBgColor = getComputedStyle(this.cardRef.value).getPropertyValue(
      '--default-bg-color'
    );
    this.selectedBgColor = getComputedStyle(
      this.cardRef.value
    ).getPropertyValue('--selected-bg-color');
  }

  render() {
    return html`
      <div class="card-container">
        <div class="connector ${this.leftConnectorClassName}"></div>
        <div
          ${ref(this.cardRef)}
          class="ontology-card ${this.hidden ? 'hidden' : ''} ${this.mode ===
          'hero'
            ? 'selected'
            : ''}"
        >
          <div class="ontology-card-header">
            <h3>${this.data?.label || '...'}</h3>
            ${this.mode === 'hero'
              ? html`
                  <div class="table-container">
                    <table>
                      <tbody>
                        ${Object.keys(this.data)
                          .filter((key) => !this._skipKeys.includes(key))
                          .map((key) => {
                            return html`
                              <tr>
                                <td class="key">${KEYS_MAP[key].text}:</td>
                                <td class="data">
                                  <a
                                    class="hyper-text -external"
                                    href="${KEYS_MAP[key].link}${this.data[
                                      key
                                    ]}"
                                    target="_blank"
                                    >${this.data[key]}</a
                                  >
                                </td>
                              </tr>
                            `;
                          })}
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

customElements.define('ontology-card', OntologyCard);
