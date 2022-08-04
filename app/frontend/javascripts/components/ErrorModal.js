import { LitElement, css, html } from 'lit';

export class ErrorModal extends LitElement {
  static styles = css`
    p {
      font-size: 2em;
      color: green;
    }
  `;

  static properties() {
    return {
      erorMessage: { type: String },
    };
  }

  constructor() {
    super(...arguments);
    this.errorMessage = '';
  }

  render() {
    return html`
      <div class="err-container">
        <p>${this.errorMessage}</p>
      </div>
    `;
  }
}

customElements.define('error-modal', ErrorModal);
