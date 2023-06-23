import { LitElement, html, nothing } from 'lit';
import { map } from 'lit/directives/map.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { Task } from '@lit-labs/task';
import { ref, createRef } from 'lit/directives/ref.js';
import { debounce } from '../../../utils/debounce';
import { axios } from '../../../utils/cachedAxios';
// import { API_URL } from '../../global';
import { scrollMeUp } from './scrollMeUp';

// const DISEASE_ADVANCED_SUGGEST_URL = `${API_URL}/api/search/disease?term=`;

// suggestAPIURL =  DISEASE_ADVANCED_SUGGEST_URL,
// suggestAPIQueryParam = term

export default class SearchField extends LitElement {
  #getSuggestURL = () => {};
  inputRef = createRef();

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
    () => this.value
  );

  static properties = {
    value: { type: String, state: true },
    showSuggestions: { type: Boolean, state: true },
    currentSuggestionIndex: { type: Number, state: true },
    suggestData: {
      type: Array,
      state: true,
    },
    suggestAPIURL: { type: String },
    suggestAPIQueryParam: { type: String },
  };

  constructor(placeholder = 'Enter disease name') {
    super();
    this.value = '';
    this.placeholder = placeholder;
    this.showSuggestions = false;
    this.currentSuggestionIndex = -1;
    this.suggestData = null;
    this.highlightIndex = -1;
    this.suggestAPIURL = '';
    this.suggestAPIQueryParam = '';
  }

  _keyup(e) {
    if (e.target && e.target.nodeName === 'INPUT') {
      this.value = e.target.value;
    }
  }

  _select(suggestion) {
    this.dispatchEvent(
      new CustomEvent('new-suggestion-selected', {
        detail: {
          id: suggestion.id,
          label: suggestion.label,
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
    if (changed.has('value')) {
      if (this.value.length >= 3) {
        this.showSuggestions = true;
      } else {
        this.showSuggestions = false;
      }
    }
    if (changed.has('suggestAPIURL') && this.suggestAPIURL) {
      if (this.suggestAPIQueryParam) {
        this.#getSuggestURL = (text) => {
          const url = new URL(this.suggestAPIURL);
          url.searchParams.set(this.suggestAPIQueryParam, text);
          return url.toString();
        };
      } else {
        this.#getSuggestURL = (text) => {
          return `${this.suggestAPIURL}${text}`;
        };
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
              ${ref(this.inputRef)}
              type="text"
              placeholder="${this.placeholder}"
              value="${this.value}"
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
