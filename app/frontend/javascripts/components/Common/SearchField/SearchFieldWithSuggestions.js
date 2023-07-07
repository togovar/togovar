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
 * @property {object} valueMappings - what from suggestion to map to the .value and .label
 * @property {string} valueMappings.valueKey - what to map to the .value (usually "id")
 * @property {string} valueMappings.labelKey - what to map to the .label
 * @property {object} titleMappings - how to map to the suggestion title
 *
 */

export default class SearchElementWithSuggestions extends LitElement {
  #getSuggestURL = (text) => text;

  /** @type {SearchFieldOptions} */
  #searchFieldOptions = {};

  /** @type {string[]} */
  #suggestionKeysArray = [];

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
    this.term = '';
    this.options = options;

    this.#searchFieldOptions = options;

    this.suggestData = [];
    this.showSuggestions = false;
    this.currentSuggestionIndex = -1;
    this.currentSuggestionColumnIndex = -1;

    this['options-value-key'] = '';
    this['options-label-key'] = '';
    this['options-title-mappings'] = '';

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
    currentSuggestionColumnIndex: { type: Number, state: true },
    suggestData: {
      type: Array,
      state: true,
    },
    options: { type: Object, state: true },
    'options-value-key': { type: String, attribute: 'options-value-key' },
    'options-label-key': { type: String, attribute: 'options-label-key' },
    'options-title-mappings': {
      type: String,
      attribute: 'options-title-mappings',
    },
    columnsTitleMapping: { type: Object },
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

    if (changed.has('options') && this.options) {
      this.#searchFieldOptions = {
        ...this.#searchFieldOptions,
        ...this.options,
      };
    }

    if (changed.has('options-value-key') || changed.has('options-label-key')) {
      if (this['options-label-key'] || this['options-value-key']) {
        this.#searchFieldOptions = {
          ...this.#searchFieldOptions,
          valueMappings: {
            valueKey: this['options-value-key'],
            labelKey: this['options-label-key'],
          },
        };
      }
    }

    if (changed.has('options') && this.options.titleMappings) {
      this.#searchFieldOptions = {
        ...this.#searchFieldOptions,
        titleMappings: this.options.titleMappings,
      };
      this.#suggestionKeysArray = Object.keys(this.options.titleMappings);
    }
    if (changed.has('options-title-mappings')) {
      if (this['options-title-mappings']) {
        const titleMappings = JSON.parse(
          JSON.parse(this['options-title-mappings'].replaceAll("'", '"'))
        );
        this.#searchFieldOptions.titleMappings = titleMappings;
        this.#suggestionKeysArray = Object.keys(titleMappings);
      }
    }
  }

  #hideSuggestions = () => {
    this.showSuggestions = false;
  };

  #handleUpDownKeys = (e) => {
    if (
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight'
    ) {
      e.preventDefault();
    }

    switch (e.key) {
      case 'ArrowLeft':
        if (this.currentSuggestionColumnIndex - 1 < 0) {
          this.currentSuggestionColumnIndex =
            this.#suggestionKeysArray.length - 1;
          return;
        }
        this.currentSuggestionColumnIndex--;
        break;
      case 'ArrowRight':
        if (
          this.currentSuggestionColumnIndex + 1 >
          this.#suggestionKeysArray.length - 1
        ) {
          this.currentSuggestionColumnIndex = 0;
          return;
        }
        this.currentSuggestionColumnIndex++;
        break;
      case 'ArrowUp':
        if (this.currentSuggestionIndex - 1 < 0) {
          this.currentSuggestionIndex = this.suggestData.length - 1;
          return;
        }
        this.currentSuggestionIndex--;
        break;
      case 'ArrowDown':
        if (this.currentSuggestionIndex + 1 > this.suggestData?.length - 1) {
          this.currentSuggestionIndex = 0;
          return;
        }
        this.currentSuggestionIndex++;
        break;
      case 'Enter':
        if (Array.isArray(this.suggestData) && this.suggestData.length > 0) {
          this.#select(this.suggestData[this.currentSuggestionIndex]);
        } else if (!Array.isArray(this.suggestData) && this.suggestData) {
          // if suggestData is from Simple search, it is an object
          this.#select(
            this.suggestData[
              this.#suggestionKeysArray[this.currentSuggestionColumnIndex]
            ][this.currentSuggestionIndex]
          );
        }
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
    this.value = suggestion[this.#searchFieldOptions.valueMappings.valueKey];
    this.label = suggestion[this.#searchFieldOptions.valueMappings.labelKey];

    this.dispatchEvent(
      new CustomEvent('new-suggestion-selected', {
        detail: {
          id: suggestion[this.#searchFieldOptions.valueMappings.valueKey],
          label: suggestion[this.#searchFieldOptions.valueMappings.labelKey],
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
    this.currentSuggestionColumnIndex = -1;
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
    console.log('render', this.suggestData);
    console.log('this.suggestionKeysArray', this.#suggestionKeysArray);
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
              ${map(this.#suggestionKeysArray, (key, keyIndex) => {
                return html`
                  <suggestions-list
                    .suggestData=${this.suggestData[key]}
                    .highlightedSuggestionIndex="${keyIndex ===
                    this.currentSuggestionColumnIndex
                      ? this.currentSuggestionIndex
                      : -1}"
                    .itemIdKey=${'term'}
                    .itemLabelKey=${'term'}
                    title=${this.#searchFieldOptions?.titleMappings[key]}
                    @suggestion-selected=${this.#select}
                  ></suggestions-list>
                `;
              })}
            `
          : nothing}
      </div> `;
  }

  setTerm(term) {
    this.label = term;
  }

  setExamples(examples) {
    return [];
  }
}

customElements.define(
  'search-field-with-suggestions',
  SearchElementWithSuggestions
);
