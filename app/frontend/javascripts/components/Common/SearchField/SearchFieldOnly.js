import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ref, createRef } from 'lit/directives/ref.js';
import SimpleSearchStyle from '../../../../stylesheets/object/component/search-field-only.scss';
import './SimpleSearchView';

/** Class to create a only search field */
@customElement('search-field-only')
class SearchFieldOnly extends LitElement {
  static styles = [SimpleSearchStyle];
  _inputRef = createRef();

  /**
   * @description Creates a styled search field
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
   *     <search-field-only placeholder="Search"></search-field-only>
   *   `
   * }
   * ```
   */

  /**
   * @param {HTMLDivElement} element - HTML element to which the search field is attached. (for vairant id)
   * @param {string} placeholder - Placeholder text */
  constructor(element, placeholder) {
    super();
    this.placeholder = placeholder;

    if (element) {
      element.appendChild(this);
    }
  }

  @property({ type: String }) placeholder;
  @property({ type: String }) value;

  /** Once the branch related to condition is merged, it will no longer be used */
  setTerm(term) {
    this.value = term;
  }

  connectedCallback() {
    super.connectedCallback();
    addEventListener('select-example', this._handleExampleClick.bind(this));
  }

  /** update input value */
  willUpdate(changed) {
    if (changed.has('value') && this._inputRef.value) {
      this._inputRef.value.value = this.value;
    }
  }

  /**
   * @private
   * @param {CustomEvent} e select-example (SimpleSearchView _handleExampleSelected) */
  _handleExampleClick(e) {
    this._inputRef.value.value = e.detail;
  }

  /**
   * See {@link SearchFieldtWithSuggestions _handleInput}
   * @private
   * @param {KeyboardEvent} e */
  _handleInput(e) {
    this.value = e.target.value;
    this.dispatchEvent(
      new InputEvent('input-change', {
        data: this.value,
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html` <div class="search-field-view">
      <div class="fieldcontainer">
        <div class="field">
          <input
            part="input-field"
            ${ref(this._inputRef)}
            type="search"
            .placeholder=${this.placeholder}
            @input=${this._handleInput}
          />
        </div>
      </div>
    </div>`;
  }
}

export default SearchFieldOnly;
