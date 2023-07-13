import { LitElement, html } from 'lit';
import './SearchFieldWithSuggestions';
import './SearchFieldExamples';
import './SimpleSearchButton';
import StoreManager from '../../../classes/StoreManager';

import Styles from '../../../../stylesheets/object/component/simple-search.scss';

export default class SimpleSearch extends LitElement {
  static get properties() {
    return {
      hideSuggestions: { type: Boolean, state: true },
      value: { type: String },
      placeholder: { type: String, attribute: 'placeholder' },
      examples: { type: Array },
      suggestAPIURL: { type: String },
      suggestAPIQueryParam: { type: String },
    };
  }

  static get styles() {
    return [Styles];
  }

  constructor(elm, suggestAPIURL, placeholder = 'Search', examples = []) {
    super();
    this.hideSuggestions = true;

    this.value = '';
    this.placeholder = placeholder;
    this.examples = examples;
    this.suggestAPIQueryParam = 'term';
    this.suggestAPIURL = suggestAPIURL;

    if (elm) {
      elm.appendChild(this);
    }
  }

  #handleSuggestionEnter(e) {
    this.hideSuggestions = true;
    this.value = e.detail.label;
    this.search(e.detail.label);
  }

  #handleExampleSelected(e) {
    this.hideSuggestions = true;
    this.value = e.detail.value;
    this.search(e.detail.value);
  }

  #handleTermEnter(e) {
    this.value = e.detail.value;
    this.search(e.detail.value);
  }

  search(term) {
    StoreManager.setSimpleSearchCondition('term', term);
  }

  setTerm(term) {
    this.value = term;
  }

  render() {
    return html`
      <div class="simple-search-container">
        <search-field-with-suggestions
          exportparts="input-field"
          .term="${this.value}"
          .suggestAPIURL=${this.suggestAPIURL}
          .suggestAPIQueryParam=${'term'}
          .placeholder=${this.placeholder}
          .hideSuggestions=${this.hideSuggestions}
          .options=${{
            valueMappings: {
              valueKey: 'term',
              labelKey: 'term',
              aliasOfKey: 'alias_of',
            },
            titleMappings: { gene: 'Gene names', disease: 'Disease names' },
          }}
          @new-suggestion-selected=${this.#handleSuggestionEnter}
          @search-term-enter=${this.#handleTermEnter}
          @input=${() => {
            this.hideSuggestions = false;
          }}
        ></search-field-with-suggestions>

        <search-button @click=${() => this.search(this.value)}></search-button>
      </div>
      <search-field-examples
        .examples=${this.examples}
        @example-selected=${this.#handleExampleSelected}
      >
      </search-field-examples>
    `;
  }
}

customElements.define('simple-search', SimpleSearch);