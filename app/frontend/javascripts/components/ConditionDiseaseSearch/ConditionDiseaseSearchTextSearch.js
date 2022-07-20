import { LitElement, css, html } from 'lit';
import { map } from 'lit/directives/map.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

const DISEASE_ADVANCED_SUGGEST_URL = `https://togovar-stg.biosciencedbc.jp/api/search/disease?term=`;

export default class ConditionTextSearch extends LitElement {
  static properties = {
    _value: { type: String, state: true },
    searchFor: { type: String, attribute: false },
  };

  constructor(searchFor = 'diseases', placeholder = 'Common cold') {
    super(arguments);
    //declare reactive properties
    this._value = '';
    this.placeholder = placeholder;
    this.selectedId = '';
    this.searchFor = searchFor;
    this.suggestions = [];
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
    }
  }

  _select(suggestion) {
    this.selectedId = suggestion.id;

    this._value = suggestion.label;
    this.renderRoot.querySelector("input[type='text']").value = this._value;
    this.dispatchEvent(
      new CustomEvent('new-suggestion-selected', {
        detail: {
          suggestion,
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
              type="text"
              title="${this.searchFor}"
              placeholder="${this.placeholder}"
              @input="${this._keyup}"
            />
            <button>Search</button>
          </div>
        </div>
        <div class="examples"></div>
        <div class="suggest-view">
          ${this.suggestions.length > 0
            ? html`
                <div class="column">
                  <h3 class="title">${this.searchFor}</h3>
                  <ul class="list">
                    ${map(this.suggestions, (suggestion) => {
                      return html`<li
                        class="item"
                        @click="${() => this._select(suggestion)}"
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
