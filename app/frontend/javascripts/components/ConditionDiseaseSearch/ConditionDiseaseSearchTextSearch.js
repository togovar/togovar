import { LitElement, css, html } from 'lit';
import { map } from 'lit/directives/map.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { ref, createRef } from 'lit/directives/ref.js';

const DISEASE_ADVANCED_SUGGEST_URL = `https://togovar-dev.biosciencedbc.jp/api/search/disease?term=`;

export default class ConditionTextSearch extends LitElement {
  static properties = {
    _value: { type: String, state: true },
    searchFor: { type: String, attribute: false },
    showSuggestions: { type: Boolean, state: true },
  };

  constructor(searchFor = 'diseases', placeholder = 'Common cold') {
    super(arguments);
    //declare reactive properties
    this._value = '';
    this.placeholder = placeholder;
    this.selectedId = '';
    this.searchFor = searchFor;
    this.suggestions = [];
    this.showSuggestions = false;
    this.inputRef = createRef();
    this.suggestionListRef = createRef();
  }

  keepLastValues() {}

  connectedCallback() {
    super.connectedCallback();
  }

  _keyup(e) {
    if (e.target && e.target.nodeName === 'INPUT') {
      this._value = e.target.value;

      if (this._value.length >= 3) {
        this._getSearchSuggestions();
      }

      if (this._value.length < 3) {
        this._resetSuggestions();
      }
    }
  }

  _select(suggestion) {
    this.selectedId = suggestion.id;

    this._value = suggestion.label;

    this.inputRef.value.value = this._value;

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

    this._resetSuggestions();
  }

  _resetSuggestions() {
    this.suggestions = [];
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
              @input="${this._keyup}"
              @focusout="${() => {
                this.showSuggestions = false;
              }}"
              @focusin="${() => {
                this.showSuggestions = true;
              }}"
            />
            <button>Search</button>
          </div>
        </div>

        <div class="suggest-view" ${ref(this.suggestionListRef)}>
          ${this.suggestions.length > 0 && this.showSuggestions
            ? html`
                <div class="column">
                  <h3 class="title">${this.searchFor}</h3>
                  <ul class="list">
                    ${map(this.suggestions, (suggestion) => {
                      return html`<li
                        class="item"
                        @mousedown="${() => this._select(suggestion)}"
                      >
                        ${unsafeHTML(suggestion.highlight)}
                      </li>`;
                    })}
                  </ul>
                </div>
              `
            : ''}
        </div>
      </div>
    `;
  }
}

customElements.define('condition-disease-text-search', ConditionTextSearch);
