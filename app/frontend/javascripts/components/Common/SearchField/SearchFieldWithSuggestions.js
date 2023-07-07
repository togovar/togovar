import { LitElement, html, nothing } from 'lit';
import { Task } from '@lit-labs/task';
import { axios } from '../../../utils/cachedAxios';
import './SearchFieldSimple';
import './SuggestionsList';
import { map } from 'lit/directives/map.js';
import Styles from '../../../../stylesheets/object/component/search-with-suggestions.scss';
/**
 * @typedef SearchFieldOptions
 * @type {object}
 * @property {string} valueKey - what to map to the .value (usually "id")
 * @property {string} labelKey - what to map to the .label
 */

export default class SearchElementWithSuggestions extends LitElement {
  #getSuggestURL = (text) => text;

  #apiTask = new Task(
    this,
    async (term) => {
      if (term.length >= 3) {
        this.showSuggestions = true;

        const { data } = await axios.get(this.#getSuggestURL(term));
        return (this.suggestData = data);
      }
      return Promise.resolve(() => (this.showSuggestions = false));
    },
    () => this.term
  );

  /**
   * @param {string} placeholder - Placeholder text
   * @param {string} suggestAPIURL - URL to fetch suggestions from
   * @param {string} suggestAPIQueryParam - Query parameter to be used for the API call
   * @param {HTMLElement} element - HTML element to which the search field is attached
   * @param {SearchFieldOptions} options - Options for the search field
   */
  constructor(
    placeholder,
    suggestAPIURL,
    suggestAPIQueryParam,
    element,
    options
  ) {
    super();
    this.placeholder = placeholder;
    this.element = element;
    this.suggestAPIURL = suggestAPIURL;
    this.suggestAPIQueryParam = suggestAPIQueryParam;
    this.value = null;
    this.label = '';
    this.options = options;

    this.suggestData = [];
    this.showSuggestions = false;
    this.currentSuggestionIndex = -1;

    if (this.element) {
      this.element.appendChild(this);
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

  static get styles() {
    return [Styles];
  }
  static properties = {
    value: { type: String, state: true },
    label: { type: String, state: true },
    term: { type: String, state: true },
    showSuggestions: { type: Boolean, state: true },
    currentSuggestionIndex: { type: Number, state: true },
    suggestData: {
      type: Array,
      state: true,
    },
    options: { type: Object, state: true },
    'options-value-key': { type: String, attribute: 'options-value-key' },
    'options-label-key': { type: String, attribute: 'options-label-key' },
    placeholder: { type: String, attribute: 'placeholder' },
    suggestAPIURL: {
      type: String,
      attribute: 'suggest-api-url',
      reflect: true,
    },
    suggestAPIQueryParam: {
      type: String,
      attribute: 'suggest-api-query-param',
      reflect: true,
    },
  };

  willUpdate(changed) {
    if (changed.has('suggestAPIURL') && this.suggestAPIURL) {
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

    if (changed.has('suggestData') && this.suggestData?.length) {
      this.currentSuggestionIndex = -1;
    }
    if (changed.has('currentSuggestionIndex')) {
      console.log(this.currentSuggestionIndex);
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

    if (changed.has('options-value-key') || changed.has('options-label-key')) {
      this.options = {
        valueKey: this['options-value-key'],
        labelKey: this['options-label-key'],
      };
    }
  }

  #hideSuggestions = () => {
    this.showSuggestions = false;
  };

  #handleUpDownKeys = (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
    }
    switch (e.key) {
      case 'ArrowUp':
        this.currentSuggestionIndex--;
        break;
      case 'ArrowDown':
        this.currentSuggestionIndex++;
        break;
      case 'Enter':
        this.#select(this.suggestData[this.currentSuggestionIndex]);
        break;
      case 'Escape':
        if (this.showSuggestions) {
          this.#hideSuggestions();
        } else {
          this.showSuggestions = true;
        }
        break;
      default:
        break;
    }
  };

  #select = (suggestion) => {
    this.value = suggestion[this.options.valueKey];
    this.label = suggestion[this.options.labelKey];

    this.dispatchEvent(
      new CustomEvent('new-suggestion-selected', {
        detail: {
          id: suggestion[this.options.valueKey],
          label: suggestion[this.options.labelKey],
        },
        bubbles: true,
        composed: true,
      })
    );
    this.#hideSuggestions();
  };

  #handleSuggestionSelected = (e) => {
    this.#select(e.detail);
  };

  #handleInput(e) {
    this.term = e.data;

    if (this.term.length < 3) {
      this.#hideSuggestions();
      this.suggestData = [];
    }
  }

  #handleClick() {
    this.currentSuggestionIndex = -1;
  }

  #handleFocusIn() {
    if (this.term.length > 3) {
      this.showSuggestions = true;
    }
  }

  #handleFocusOut() {
    this.#hideSuggestions();
  }

  render() {
    return html`<search-field-simple
        @change=${this.#handleInput}
        @click=${this.#handleClick}
        @focusin=${this.#handleFocusIn}
        @focusout=${this.#handleFocusOut}
        @keydown=${this.#handleUpDownKeys}
        placeholder=${this.placeholder}
      ></search-field-simple>
      <div class="suggestions-container">
        ${this.suggestData &&
        Array.isArray(this.suggestData) &&
        this.showSuggestions
          ? html`
              <suggestions-list
                .suggestData=${this.suggestData}
                .highlightedSuggestionIndex="${this.currentSuggestionIndex}"
                .itemIdKey=${'id'}
                @suggestion-selected=${this.#handleSuggestionSelected}
              ></suggestions-list>
            `
          : nothing}
        <!-- If it is simple search search box, then suggestions is an object -->
        ${this.suggestData &&
        !Array.isArray(this.suggestData) &&
        this.showSuggestions
          ? html`
              ${map(
                Object.keys(this.suggestData),
                (key) => html`
                  <suggestions-list
                    .suggestData=${this.suggestData[key]}
                    .highlightedSuggestionIndex="${this.currentSuggestionIndex}"
                    .itemIdKey=${'term'}
                    @suggestion-selected=${this.#select}
                  ></suggestions-list>
                `
              )}
            `
          : nothing}
      </div> `;
  }

  setTerm(term) {
    this.label = term;
  }
}

customElements.define(
  'search-field-with-suggestions',
  SearchElementWithSuggestions
);
