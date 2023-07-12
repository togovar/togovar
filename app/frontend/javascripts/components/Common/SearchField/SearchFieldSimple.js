import { LitElement, html } from 'lit';
import { ref, createRef } from 'lit/directives/ref.js';
import SimpleSearchStyle from '../../../../stylesheets/object/component/search-field-simple.scss';

export default class SearchFieldSimple extends LitElement {
  #inputRef = createRef();
  static get properties() {
    return {
      value: { type: String },
      placeholder: { type: String, attribute: 'placeholder' },
    };
  }

  static get styles() {
    return [SimpleSearchStyle];
  }

  /**
   * @description Creates a styled search field
   * @param {string} placeholder - Placeholder text
   * @param {HTMLElement} element - HTML element to which the search field is attached
   *
   * All events of the input field are dispatched on the element itself.
   * Can be attached with JS like this:
   * ```js
   * const searchField = new SearchField('Search', document.getElementById('search'));
   * ```
   *
   * Or with Lit like this:
   * ```js
   * render() {
   *   html`
   *     <search-field-simple placeholder="Search"></search-field-simple>
   *   `
   * }
   * ```
   */
  constructor(element, placeholder) {
    super();

    this.value = '';
    this.placeholder = placeholder;

    if (element) {
      element.appendChild(this);
    }
  }

  #handleInput(e) {
    this.value = e.target.value;

    this.dispatchEvent(
      new InputEvent('change', {
        data: this.value,
        bubbles: true,
        composed: true,
      })
    );
  }

  setTerm(term) {
    this.value = term;
  }

  willUpdate(changed) {
    if (changed.has('value') && this.#inputRef.value) {
      this.#inputRef.value.value = this.value;
    }
  }

  render() {
    return html` <div class="search-field-view">
      <div class="fieldcontainer">
        <div class="field">
          <input
            part="input-field"
            ${ref(this.#inputRef)}
            type="text"
            placeholder="${this.placeholder}"
            @input=${this.#handleInput}
          />
        </div>
      </div>
    </div>`;
  }
}

customElements.define('search-field-simple', SearchFieldSimple);
