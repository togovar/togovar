import { LitElement, html } from 'lit';

import { map } from 'lit/directives/map.js';

/** @typedef {Array<{key: string, value: string}>} ExamplesArray  */

export default class SearchFieldExamples extends LitElement {
  constructor() {
    super();
    /** @type {ExamplesArray} */
    this.examples = [];
  }

  static get properties() {
    return {
      examples: { type: Array },
    };
  }

  #handleClick(example) {
    this.dispatchEvent(
      new CustomEvent('example-selected', {
        detail: example,
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      ${map(
        this.examples,
        (example) =>
          html`<dl @click=${() => this.#handleClick(example)}>
            <dt>${example.key}</dt>
            <dd>${example.value}</dd>
          </dl>`
      )}
    `;
  }
}

customElements.define('search-field-examples', SearchFieldExamples);
