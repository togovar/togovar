import { LitElement, html } from 'lit';
import { debounce } from '../../../utils/debounce';
import { ref, createRef } from 'lit/directives/ref.js';
import SimpleSearchStyle from '../../../../stylesheets/object/component/simple-search.scss';

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

  #handleInput() {
    this.value = this.#inputRef.value.value;

    this.dispatchEvent(
      new InputEvent('change', {
        data: this.value,
        bubbles: true,
        composed: true,
      })
    );
  }

  // TODO remove event re-dispatching because standard events are already dispatched by the input field

  render() {
    return html` <div class="search-field-view">
      <div class="fieldcontainer">
        <div class="field">
          <input
            ${ref(this.#inputRef)}
            type="text"
            placeholder="${this.placeholder}"
            value="${this.value}"
            @input="${debounce(this.#handleInput, 300)}"
          />
        </div>
      </div>
    </div>`;
  }

  //   renderRoot() {
  //     return this;
  //   }
}

customElements.define('search-field-simple', SearchFieldSimple);
