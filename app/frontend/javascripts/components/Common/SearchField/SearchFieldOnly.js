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

  /** update input value */
  willUpdate(changed) {
    if (changed.has('value') && this._inputRef.value) {
      this._inputRef.value.value = this.value;
    }
  }

  /**
   * See {@link SearchFieldtWithSuggestions _handleInput}
   * @private
   * @param {KeyboardEvent} e */
  _handleInput(e) {
    e.preventDefault();
    this.value = e.target.value;
    this.dispatchEvent(
      new InputEvent('input-change', {
        data: this.value,
        bubbles: true,
        composed: true,
      })
    );
  }

  /** Control the normal behavior when pressing enter
   * @private
   * @param {KeyboardEvent} e */
  _handleForm(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  }

  /** Fires an event when the cross button is pressed
   * @private */
  _handleSeachButtonClick() {
    this.dispatchEvent(new MouseEvent('input-reset'));
  }

  render() {
    return html` <div class="search-field-view">
      <div class="fieldcontainer">
        <div class="field">
          <form class="input-form" @keydown=${this._handleForm}>
            <input
              class="searchfield"
              part="input-field"
              ${ref(this._inputRef)}
              type="text"
              .placeholder=${this.placeholder}
              @input=${this._handleInput}
              required
            />
            <button
              class="delete"
              type="reset"
              @click=${this._handleSeachButtonClick}
            ></button>
          </form>
        </div>
      </div>
    </div>`;
  }
}

export default SearchFieldOnly;
