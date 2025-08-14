import { LitElement, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';

import './SearchField';
import './SearchFieldSuggestionsList';
import { SearchFieldController } from './SearchFieldController';

import Styles from '../../../../stylesheets/object/component/search-field-with-suggestions.scss';
import { storeManager } from '../../../store/StoreManager';

/**
 * @typedef SearchFieldOptions
 * @type {object}
 * @property {object} valueMappings - what from suggestion to map to the .value and .label
 * @property {string} valueMappings.valueKey - what to map to the .value (usually "id")
 * @property {string} valueMappings.labelKey - what to map to the .label
 * @property {string} valueMappings.aliasOfKey - what to map to the .subText
 * @property {{[key: string]: string}} titleMappings - how to map to the suggestion title
 */

/** Class for search field with suggestions
 * Used by
 * {@link SimpleSearchView},
 * {@link ConditionValueEditorGene},
 * {@link ConditionValueEditorDisease} */
@customElement('search-field-with-suggestions')
class SearchFieldWithSuggestions extends LitElement {
  static styles = [Styles];

  /**
   * @param {string} placeholder - Placeholder text
   * @param {string} suggestAPIURL - URL to fetch suggestions from
   * @param {string} suggestAPIQueryParam - Query parameter to be used for the API call
   * @param {HTMLElement} element - HTML element to which the search field is attached
   * @param {SearchFieldOptions} options - Options for the search field */
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

    // コントローラーを初期化
    this._controller = new SearchFieldController(this);

    // for only  gene
    if (element) element.appendChild(this);
  }

  /** @property {string} suggestAPIURL - API URL */
  @state({ type: String }) suggestAPIURL;

  /** @property {SearchFieldOptions} options - Options for the search field */
  @state({ type: Object }) options;

  /** @property {string} term - input area value */
  @state({ type: String }) term;

  /** @property {string} value - value of selected suggestion */
  @state({ type: String }) value = '';

  /** @property {string} label - label of selected suggestion */
  @state({ type: String }) label = '';

  /** @property {boolean} showSuggestions - Whether suggestions are displayed */
  @state({ type: Boolean }) showSuggestions = false;

  /** @property {Number} currentSuggestionIndex - Position from top of selection  */
  @state({ type: Number }) currentSuggestionIndex = -1;

  /** @property {Number} currentSuggestionColumnIndex - Position from side of selection  */
  @state({ type: Number }) currentSuggestionColumnIndex = 0;

  /**  @property {Array} suggestData - suggestData list */
  @state({ type: Array }) suggestData = [];

  /** @property {string[]} _suggestionKeysArray - suggest content key */
  @state({ type: Array }) _suggestionKeysArray = [];

  /**
   * @private
   * @param {string} term - input value d*/
  get _apiTask() {
    return this._controller.apiTask;
  }

  /** compute property values that depend on other properties and are used in the rest of the update process */
  willUpdate(changedProperties) {
    if (changedProperties.has('suggestAPIURL')) {
      this._controller.setSuggestURL(
        this.suggestAPIURL,
        this.suggestAPIQueryParam
      );
    }

    if (changedProperties.has('options')) {
      this._searchFieldOptions = { ...this.options };
    }
  }

  /** Hide suggestions
   * @private */
  _hideSuggestions() {
    this.showSuggestions = false;
  }

  /** Handle index of column
   * @private */
  _handleStepThroughColumns() {
    if (
      this.currentSuggestionIndex >
      this.suggestData[
        this._suggestionKeysArray[this.currentSuggestionColumnIndex]
      ]?.length -
        1
    ) {
      this.currentSuggestionIndex =
        this.suggestData[
          this._suggestionKeysArray[this.currentSuggestionColumnIndex]
        ]?.length - 1;
    }
  }

  /** Select with keydown(ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Enter, Escape)
   * @private
   * @param {Event} e
   * @returns {void} */
  _handleUpDownKeys = (e) => {
    if (!this.showSuggestions) {
      storeManager.setData('showSuggest', false);
    }

    const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (
      arrowKeys.includes(e.key) &&
      this.showSuggestions &&
      this.currentSuggestionIndex !== -1
    ) {
      e.preventDefault();
    }

    switch (e.key) {
      case 'ArrowLeft':
        if (this.currentSuggestionColumnIndex - 1 < 0) {
          this.currentSuggestionColumnIndex =
            this._suggestionKeysArray?.length - 1;

          return;
        }
        this.currentSuggestionColumnIndex--;
        this._handleStepThroughColumns();
        break;

      case 'ArrowRight':
        if (
          this.currentSuggestionColumnIndex + 1 >
          this._suggestionKeysArray?.length - 1
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
            ]?.length - 1;
          return;
        }
        this.currentSuggestionIndex--;
        break;

      case 'ArrowDown':
        if (
          this.currentSuggestionIndex + 1 >
          this.suggestData[
            this._suggestionKeysArray[this.currentSuggestionColumnIndex]
          ]?.length -
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
          [this.currentSuggestionIndex, this.currentSuggestionColumnIndex] = [
            -1, 0,
          ];
          this._hideSuggestions();
        } else {
          this._apiWithoutSelect(this.term);
        }
        break;

      case 'Escape':
        this._hideSuggestions();
        break;
      default:
        break;
    }
  };

  /** Put the selected value in value and label, create new-suggestion-selected event, and hide suggestion
   * @param {Object} suggestion - Symple{term, alias_of}, Gene{slias_of, highlight, id, name, symbol}
   * @private */
  _select = (suggestion) => {
    const escapeString = (str) =>
      String(str || '')
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"');

    const valueKey =
      suggestion[this._searchFieldOptions.valueMappings.valueKey] || '';
    const labelKey =
      suggestion[this._searchFieldOptions.valueMappings.labelKey] || '';

    // SimpleSearchの場合のみダブルクォートを付ける
    // gene, diseaseの場合は付けない
    const isSimpleSearch = this._suggestionKeysArray.length > 1;

    if (isSimpleSearch) {
      this.value = `"${escapeString(valueKey)}"`;
      this.label = `"${escapeString(labelKey)}"`;
    } else {
      this.value = escapeString(valueKey);
      this.label = escapeString(labelKey);
    }

    this.dispatchEvent(
      new CustomEvent('new-suggestion-selected', {
        detail: { id: this.value, label: this.label },
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

  /** Put the characters input in this.term, (Only SimpleSearch)create input-term event, hide suggestions if the length is less than 3, and empty suggestData
   * @private */
  _handleInput(e) {
    this.term = e.data;
    this.dispatchEvent(
      new CustomEvent('input-term', {
        detail: e.data,
        bubbles: true,
        composed: true,
      })
    );
    if (this.term.length < 3) {
      this._controller.hideSuggestions();
      this._controller.clearSuggestData();
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
      this._controller.showSuggestions();
    }
  }

  /** Hide suggestions when focus moves away from input
   * @private */
  _handleFocusOut() {
    this._hideSuggestions();
    storeManager.setData('showSuggest', false);
  }

  /** Hide suggestions and empty input when input is reset. input-reset event for simple search
   * @private */
  _handleInputReset() {
    this.term = '';
    this.value = '';
    this.label = '';
    this.showSuggestions = false;
    this._controller.clearSuggestData();
    this._hideSuggestions();
    this.dispatchEvent(new CustomEvent('input-reset'));
  }

  render() {
    return html`
      <search-field
        exportparts="input-field"
        value=${this.term}
        .placeholder=${this.placeholder}
        @input-change=${this._handleInput}
        @click=${this._handleClick}
        @focusin=${this._handleFocusIn}
        @focusout=${this._handleFocusOut}
        @keydown=${this._handleUpDownKeys}
        @input-reset=${this._handleInputReset}
      ></search-field>
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

export default SearchFieldWithSuggestions;
