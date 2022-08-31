import { LitElement, html, nothing } from 'lit';
import { map } from 'lit/directives/map.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { Task } from '@lit-labs/task';
import { ref, createRef } from 'lit/directives/ref.js';
import { debounce } from '../../utils/debounce';
import { cachedAxios } from '../../utils/cachedAxios';

const DISEASE_ADVANCED_SUGGEST_URL = `https://togovar-dev.biosciencedbc.jp/api/search/disease?term=`;

export default class ConditionTextSearch extends LitElement {
  static properties = {
    _value: { type: String, state: true },
    searchFor: { type: String, attribute: false },
    showSuggestions: { type: Boolean, state: true },
  };

  constructor(searchFor = 'diseases', placeholder = 'Common cold') {
    super(arguments);

    this._value = '';
    this.placeholder = placeholder;
    this.selectedId = '';
    this.searchFor = searchFor;
    this.suggestions = [];
    this.showSuggestions = false;
    this.inputRef = createRef();
    this.suggestionListRef = createRef();
    this.API = new cachedAxios(DISEASE_ADVANCED_SUGGEST_URL);
    this._apiTask = new Task(
      this,
      (value) => {
        if (value.length >= 3) {
          this.showSuggestions = true;
          return this.API.get(value);
        }
        return Promise.resolve(() => (this.showSuggestions = false));
      },
      () => this._value
    );
  }

  _keyup(e) {
    if (e.target && e.target.nodeName === 'INPUT') {
      this._value = e.target.value;
    }
  }

  _select(suggestion) {
    this.selectedId = suggestion.id;

    this.dispatchEvent(
      new CustomEvent('new-suggestion-selected', {
        detail: {
          id: suggestion.id,
          label: suggestion.label,
          cui: suggestion.cui,
        },
        bubbles: true,
        composed: true,
      })
    );

    this.showSuggestions = false;
  }

  _getSearchSuggestions() {
    const result = fetch(DISEASE_ADVANCED_SUGGEST_URL + this._value, {
      headers: {
        'Content-type': 'application/json',
        Accept: 'application/json',
      },
    })
      .then((result) => result.json())
      .then((json) => {
        this.suggestions = json;
      });
  }

  willUpdate(changed) {
    if (changed.has('_value')) {
      if (this._value.length >= 3) {
        this.showSuggestions = true;
      } else {
        this.showSuggestions = false;
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
              title="${this.searchFor}"
              placeholder="${this.placeholder}"
              value="${this._value}"
              @input="${debounce(this._keyup, 300)}"
              @focusout="${() => {
                this.showSuggestions = false;
              }}"
              @focusin="${() => {
                this.showSuggestions = true;
              }}"
            />
          </div>
        </div>

        ${this.showSuggestions
          ? html`
              <div class="suggest-view" ${ref(this.suggestionListRef)}>
                <div class="column">
                  
                  ${this._apiTask.render({
                    pending: () =>
                      html` <div class="loading"><span></span></div> `,
                    error: (error) =>
                      html`
                        <div class="error"><span>${error.message}</span></div>
                      `,
                    complete: ({ data }) => {
                      let num = 0;
                      for (let d in data) {
                        num++;
                      }
                      if (!num) {
                        return html`<div class="empty">
                          <span>No suggestions was found</span>
                        </div>`;
                      }
                      return html`
                        <ul class="list">
                          ${map(data, (suggestion) => {
                            return html`<li
                              class="item"
                              @mousedown="${() => this._select(suggestion)}"
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

customElements.define('condition-disease-text-search', ConditionTextSearch);
