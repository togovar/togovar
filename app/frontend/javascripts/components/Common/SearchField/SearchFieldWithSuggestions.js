import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { Task } from '@lit-labs/task';
import { axios } from '../../../utils/cachedAxios';

import './SearchFieldOnly';
import './SearchFieldSuggestionsList';

import Styles from '../../../../stylesheets/object/component/search-field-with-suggestions.scss';
import { debounce } from '../../../utils/debounce';

/**
 * @typedef SearchFieldOptions
 * @type {object}
 * @property {object} valueMappings - what from suggestion to map to the .value and .label
 * @property {string} valueMappings.valueKey - what to map to the .value (usually "id")
 * @property {string} valueMappings.labelKey - what to map to the .label
 * @property {string} valueMappings.aliasOfKey - what to map to the .subText
 * @property {{[key: string]: string}} titleMappings - how to map to the suggestion title
 */

/** Class for search field with suggestions */
@customElement('search-field-with-suggestions')
class SearchFieldtWithSuggestions extends LitElement {
  static styles = [Styles];

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
    this.suggestAPIURL = suggestAPIURL;
    this.suggestAPIQueryParam = suggestAPIQueryParam;
    this._searchFieldOptions = options;

    if (element) {
      element.appendChild(this);
      if (this.suggestAPIQueryParam) {
        this._getSuggestURL = (text) => {
          const url = new URL(this.suggestAPIURL);
          url.searchParams.set(this.suggestAPIQueryParam, text);
          return url.toString();
        };
      } else {
        this._getSuggestURL = (text) => {
          return `${this.suggestAPIURL}/${text}`;
        };
      }
    }
  }

  /** value of the selected suggestion */
  @property({ type: String }) value = '';

  /** label of selected suggestion */
  @property({ type: String, state: true }) label = '';

  @property({ type: Boolean, state: true }) showSuggestions = false;

  @property({ type: Number, state: true }) currentSuggestionIndex = -1;

  @property({ type: Number, state: true }) currentSuggestionColumnIndex = 0;

  /** @property {SearchFieldOptions} options - Options for the search field */
  @property({ type: Object, state: true }) options;

  @property({ type: Array, state: true }) suggestData = [];

  /** currently entered text */
  @property({ type: String }) term;

  @property({ type: Boolean }) hideSuggestions = false;

  @property({ type: String }) placeholder;

  /** @property {string} suggestAPIURL */
  @property({ type: String }) suggestAPIURL;

  _getSuggestURL = (text) => text;

  /** @property {SearchFieldOptions} */
  _searchFieldOptions = {};

  /** @property {string[]} */
  _suggestionKeysArray = [];

  /**
   * @private
   * @param {string} term - input value d*/
  _apiTask = new Task(
    this,
    debounce(async (term) => {
      if (term.length >= 3) {
        this.showSuggestions = true;
        const { data } = await axios.get(this._getSuggestURL(term));
        let dataToReturn;

        // Make suggestion data same format for simple & gene etc search
        if (Array.isArray(data)) {
          dataToReturn = { data: data };
          this._suggestionKeysArray = ['data'];
        } else {
          dataToReturn = data;
          this._suggestionKeysArray = Object.keys(data);
        }
        return (this.suggestData = dataToReturn);
      }
      return Promise.resolve(() => (this.showSuggestions = false));
    }, 300),
    () => this.term
  );

  /**
   * compute property values that depend on other properties and are used in the rest of the update process
   */
  willUpdate(changedProperties) {
    if (changedProperties.has('suggestAPIURL')) {
      if (this.suggestAPIQueryParam) {
        this._getSuggestURL = (text) => {
          const url = new URL(this.suggestAPIURL);
          url.searchParams.set(this.suggestAPIQueryParam, text);
          return url.toString();
        };
      } else {
        this._getSuggestURL = (text) => {
          return `${this.suggestAPIURL}/${text}`;
        };
      }
    }

    if (changedProperties.has('options')) {
      this._searchFieldOptions = {
        ...this._searchFieldOptions,
        ...this.options,
      };
    }
  }

  _hideSuggestions() {
    this.showSuggestions = false;
  }

  _handleStepThroughColumns() {
    if (
      this.currentSuggestionIndex >
      this.suggestData[
        this._suggestionKeysArray[this.currentSuggestionColumnIndex]
      ].length -
        1
    ) {
      this.currentSuggestionIndex =
        this.suggestData[
          this._suggestionKeysArray[this.currentSuggestionColumnIndex]
        ].length - 1;
    }
  }

  /** Select with keydown(ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Enter, Escape)
   * @private
   * @param {Event} e
   * @returns {void} */
  _handleUpDownKeys = (e) => {
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
            this._suggestionKeysArray.length - 1;

          return;
        }
        this.currentSuggestionColumnIndex--;
        this._handleStepThroughColumns();
        break;

      case 'ArrowRight':
        if (
          this.currentSuggestionColumnIndex + 1 >
          this._suggestionKeysArray.length - 1
        ) {
          this.currentSuggestionColumnIndex = 0;
          return;
        }
        this.currentSuggestionColumnIndex++;
        this._handleStepThroughColumns();
        break;

      case 'ArrowUp':
        if (this.currentSuggestionIndex - 1 < 0) {
          this.currentSuggestionIndex =
            this.suggestData[
              this._suggestionKeysArray[this.currentSuggestionColumnIndex]
            ].length - 1;
          return;
        }
        this.currentSuggestionIndex--;
        break;

      case 'ArrowDown':
        if (
          this.currentSuggestionIndex + 1 >
          this.suggestData[
            this._suggestionKeysArray[this.currentSuggestionColumnIndex]
          ].length -
            1
        ) {
          this.currentSuggestionIndex = 0;
          return;
        }
        this.currentSuggestionIndex++;
        break;

      case 'Enter':
        if (this.showSuggestions && this.currentSuggestionIndex !== -1) {
          this._select(
            this.suggestData[
              this._suggestionKeysArray[this.currentSuggestionColumnIndex]
            ][this.currentSuggestionIndex]
          );
          this.currentSuggestionIndex = -1;
          this._hideSuggestions();
        } else {
          this._apiWithoutSelect(this.term);
        }
        break;

      case 'Escape':
        if (this.showSuggestions) {
          this._hideSuggestions();
        }
        break;
      default:
        break;
    }
  };

  /** Put the selected value in value and label, create new-suggestion-selected event, and hide suggestion
   * @param {Object} suggestion - Symple{term, alias_of}, Gene{slias_of, highlight, id, name, symbol}
   * @private */
  _select = (suggestion) => {
    this.value = suggestion[this._searchFieldOptions.valueMappings.valueKey];
    this.label = suggestion[this._searchFieldOptions.valueMappings.labelKey];

    this.dispatchEvent(
      new CustomEvent('new-suggestion-selected', {
        detail: {
          id: suggestion[this._searchFieldOptions.valueMappings.valueKey],
          label: suggestion[this._searchFieldOptions.valueMappings.labelKey],
        },
        bubbles: true,
        composed: true,
      })
    );
  };

  /** (Only SimpleSearch) Search without suggestions, create search-term-enter event and hide suggest after event firing
   * @private
   * @param {string} term - input value */
  _apiWithoutSelect = (term) => {
    this.dispatchEvent(
      new CustomEvent('search-term-enter', {
        detail: term,
        bubbles: true,
        composed: true,
      })
    );
    this._hideSuggestions();
  };

  /** e.detail: Symple{term, alias_of}, Gene{slias_of, highlight, id, name, symbol}
   * @private */
  _handleSuggestionSelected = (e) => {
    this._select(e.detail);
  };

  /** Put the characters input in this.term, (Only SimpleSearch)create imput-term event, hide suggestions if the length is less than 3, and empty suggestData
   * @private */
  _handleInput(e) {
    this.term = e.data;
    this.dispatchEvent(
      new CustomEvent('imput-term', {
        detail: e.data,
        bubbles: true,
        composed: true,
      })
    );
    if (this.term.length < 3) {
      this._hideSuggestions();
      this.suggestData = [];
    }
  }

  /** Initialize currentSuggestion position when input is clicked.
   * @private */
  _handleClick() {
    this.currentSuggestionIndex = -1;
    this.currentSuggestionColumnIndex = 0;
  }

  /** Display suggestions, if the input character is greater than 3 when the focus on.
   * @private */
  _handleFocusIn() {
    if (this.term?.length > 3) {
      this.showSuggestions = true;
    }
  }

  /** Hide suggestions when focus moves away from input
   * @private */
  _handleFocusOut() {
    this._hideSuggestions();
  }

  render() {
    return html`
      <search-field-only
        @input-change=${this._handleInput}
        @click=${this._handleClick}
        @focusin=${this._handleFocusIn}
        @focusout=${this._handleFocusOut}
        @keydown=${this._handleUpDownKeys}
        .placeholder=${this.placeholder}
        value=${this.term}
        exportparts="input-field"
      ></search-field-only>
      <div class="suggestions-container">
        ${this.suggestData && this.showSuggestions && !this.hideSuggestions
          ? html`
              ${map(this._suggestionKeysArray, (key, keyIndex) => {
                return html`
                  <div class="column">
                    <search-field-suggestions-list
                      .suggestData=${this.suggestData[key]}
                      .highlightedSuggestionIndex="${keyIndex ===
                      this.currentSuggestionColumnIndex
                        ? this.currentSuggestionIndex
                        : -1}"
                      .itemIdKey=${'term'}
                      .itemLabelKey=${'term'}
                      .subTextKey=${this._searchFieldOptions?.valueMappings
                        ?.aliasOfKey}
                      title=${this._searchFieldOptions?.titleMappings?.[key]}
                      @suggestion-selected=${this._handleSuggestionSelected}
                    ></search-field-suggestions-list>
                  </div>
                `;
              })}
            `
          : nothing}
      </div>
    `;
  }
}

export default SearchFieldtWithSuggestions;
