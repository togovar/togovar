import { LitElement, html, nothing } from 'lit';
import { map } from 'lit/directives/map.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { Task } from '@lit-labs/task';
import { ref, createRef, Ref } from 'lit/directives/ref.js';
import { debounce } from '../../../utils/debounce';
import { axios } from '../../../utils/cachedAxios';
import { scrollMeUp } from './scrollMeUp';

/**
 * @typedef SuggestAPIParams
 * @type {object}
 * @property {string} suggestAPIURL
 * @property {string} suggestAPIQueryParam
 */

/**
 * @typedef SearchFieldOptions
 * @type {object}
 * @property {string} id
 * @property {string} value
 */

/**
 * @typedef SuggestSelectEvent
 * @property {object} detail
 * @property {string} detail.id
 * @property {string} detail.value
 */

export default class SearchField extends LitElement {
  #getSuggestURL = (text) => text;
  /** @type {SearchFieldOptions} */
  #options = {};

  /** @type {Ref<HTMLInputElement>} */
  #inputRef = createRef();

  apiTask = new Task(
    this,
    (value) => {
      if (value.length >= 3) {
        this.showSuggestions = true;

        return axios
          .get(this.#getSuggestURL(value))
          .then((data) => (this.suggestData = data.data));
      }
      return Promise.resolve(() => (this.showSuggestions = false));
    },
    () => this.label
  );

  static properties = {
    value: { type: String, state: true },
    label: { type: String, state: true },
    showSuggestions: { type: Boolean, state: true },
    currentSuggestionIndex: { type: Number, state: true },
    suggestData: {
      type: Array,
      state: true,
    },
    placeholder: { type: String },
    suggestAPIURL: { type: String },
    suggestAPIQueryParam: { type: String },
  };

  /**
   *
   * @param {SuggestAPIParams | null} suggestAPIParams
   * @param {string} placeholder
   * @param {SearchFieldOptions} options
   * @param {HTMLElement} element
   */
  constructor(
    suggestAPIParams = null,
    placeholder = 'Start typing ...',
    options = { id: 'id', value: 'label' },
    element = null
  ) {
    super();
    this.value = '';
    this.label = '';
    this.placeholder = '';
    this.showSuggestions = false;
    this.currentSuggestionIndex = -1;
    this.suggestData = null;
    this.highlightIndex = -1;
    this.suggestAPIURL = '';
    this.suggestAPIQueryParam = '';
    if (element) {
      // that means is was appended with new keyword
      this.placeholder = placeholder;
      this.#options = options;
      element.appendChild(this);
      if (suggestAPIParams.suggestAPIURL) {
        if (suggestAPIParams.suggestAPIQueryParam) {
          this.#getSuggestURL = (text) => {
            const url = new URL(suggestAPIParams.suggestAPIURL);
            url.searchParams.set(suggestAPIParams.suggestAPIQueryParam, text);
            return url.toString();
          };
        } else {
          this.#getSuggestURL = (text) => {
            return `${suggestAPIParams.suggestAPIURL}/${text}`;
          };
        }
      }
    }
  }

  _keyup(e) {
    if (e.target && e.target.nodeName === 'INPUT') {
      this.label = e.target.value;
    }
  }

  _select(suggestion) {
    this.value = suggestion[this.#options.id];
    this.label = suggestion[this.#options.value];
    this.dispatchEvent(
      new CustomEvent('new-suggestion-selected', {
        detail: {
          id: suggestion[this.#options.id],
          label: suggestion[this.#options.value],
        },
        bubbles: true,
        composed: true,
      })
    );

    this._hideSuggestions();
  }

  _hideSuggestions() {
    this.showSuggestions = false;
    this.currentSuggestionIndex = -1;
  }

  _handleUpDownKeys(e) {
    switch (e.key) {
      case 'ArrowUp':
        this.currentSuggestionIndex--;
        break;
      case 'ArrowDown':
        this.currentSuggestionIndex++;
        break;
      case 'Enter':
        this._select(this.suggestData[this.currentSuggestionIndex]);
        break;
      case 'Escape':
        if (this.showSuggestions) {
          this._hideSuggestions();
        } else {
          this.showSuggestions = true;
        }
        break;
      default:
        break;
    }
  }

  willUpdate(changed) {
    if (changed.has('label')) {
      if (this.label.length >= 3) {
        this.showSuggestions = true;
      } else {
        this.showSuggestions = false;
      }
    }

    if (changed.has('suggestData') && this.suggestData?.length) {
      this.currentSuggestionIndex = -1;
    }
    if (changed.has('currentSuggestionIndex') && this.showSuggestions) {
      if (this.suggestData?.length) {
        if (this.currentSuggestionIndex > this.suggestData?.length - 1) {
          this.currentSuggestionIndex = 0;
        }
        if (this.currentSuggestionIndex < 0) {
          this.currentSuggestionIndex = this.suggestData.length - 1;
        }
      }
    }
    if (changed.has('suggestAPIURL') || changed.has('suggestAPIQueryParam')) {
      if (this.suggestAPIURL) {
        if (this.suggestAPIQueryParam) {
          this.#getSuggestURL = (text) => {
            const url = new URL(this.suggestAPIURL);
            url.searchParams.set(this.suggestAPIQueryParam, text);
            return url.toString();
          };
        } else {
          this.#getSuggestURL = (text) => {
            return `${this.suggestAPIURL}/${text}`;
          };
        }
      }
    }
  }

  get value() {
    return this.value;
  }

  get label() {
    return this.label;
  }

  setTerm(term) {
    this.label = term;
  }

  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div class="search-field-view">
        <div class="fieldcontainer">
          <div class="field">
            <input
              ${ref(this.#inputRef)}
              type="text"
              placeholder="${this.placeholder}"
              value="${this.label}"
              @input="${debounce(this._keyup, 300)}"
              @focusout="${this._hideSuggestions}"
              @focusin="${() => {
                this.showSuggestions = true;
              }}"
              @click="${() => (this.currentSuggestionIndex = -1)}"
              @keydown="${this._handleUpDownKeys}"
            />
          </div>
        </div>

        ${this.showSuggestions
          ? html`
              <div class="suggest-view" >
                <div class="column">
                  
                  ${this.apiTask.render({
                    pending: () =>
                      html` <div class="loading"><span></span></div> `,
                    error: (error) =>
                      html`
                        <div class="error"><span>${error.message}</span></div>
                      `,
                    complete: () => {
                      if (!this.suggestData?.length) {
                        return html`<div class="empty">
                          <span>No suggestions were found</span>
                        </div>`;
                      }
                      return html`
                        <ul class="list">
                          ${map(this.suggestData, (suggestion, index) => {
                            return html`<li
                              class="item ${this.currentSuggestionIndex ===
                              index
                                ? '-selected'
                                : ''}"
                              @mousedown="${() => this._select(suggestion)}"
                              ${scrollMeUp(
                                this.currentSuggestionIndex === index
                              )}
                            >
                              ${unsafeHTML(suggestion.highlight)}
                            </li>`;
                          })}
                        </ul>
                      `;
                    },
                  })}
                  </div>
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }
}

customElements.define('search-field', SearchField);
