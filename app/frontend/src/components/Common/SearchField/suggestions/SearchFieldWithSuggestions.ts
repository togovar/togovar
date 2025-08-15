import { LitElement, html, nothing, CSSResultGroup, TemplateResult } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';

import '../SearchField';
import './SearchFieldSuggestionsList';
import { SearchFieldController } from './handlers/SearchFieldController';
import { SuggestionKeyboardHandler } from './handlers/SuggestionKeyboardHandler';
import { SuggestionSelectionHandler } from './handlers/SuggestionSelectionHandler';
import { InputEventHandler } from './handlers/InputEventHandler';

import Styles from '../../../../../stylesheets/object/component/search-field-with-suggestions.scss';

/** Suggestion data structure */
export interface SuggestionData {
  term?: string;
  alias_of?: string;
  highlight?: string;
  id?: string;
  name?: string;
  symbol?: string;
  [key: string]: any;
}

/** Options for configuring the search field behavior */
export interface SearchFieldOptions {
  /** Mappings for suggestion values */
  valueMappings: {
    /** Key to map to the value (usually "id") */
    valueKey: string;
    /** Key to map to the label */
    labelKey: string;
    /** Key to map to the subText (optional) */
    aliasOfKey?: string;
  };
  /** Mappings for suggestion titles (optional) */
  titleMappings?: { [key: string]: string };
}

/** Host interface for handlers */
export interface SearchFieldHost {
  _searchFieldOptions: SearchFieldOptions;
  _suggestionKeysArray: string[];
  value: string;
  label: string;
  hideSuggestionsMethod(): void;
  dispatchEvent(event: CustomEvent): boolean;
}

/** Partial options type for more flexible configuration */
export type PartialSearchFieldOptions = {
  valueMappings: Partial<SearchFieldOptions['valueMappings']> & {
    valueKey: string;
    labelKey: string;
  };
  titleMappings?: { [key: string]: string };
};

/** Class for search field with suggestions
 * Used by SimpleSearchView, ConditionValueEditorGene, ConditionValueEditorDisease */
@customElement('search-field-with-suggestions')
class SearchFieldWithSuggestions extends LitElement {
  static styles: CSSResultGroup = [Styles];

  // ============================================================================
  // Properties (External Configuration)
  // ============================================================================
  @property() suggestAPIURL: string = ''; // API URL
  @property() suggestAPIQueryParam: string = ''; // Query parameter for API
  @property({ type: Object }) options?: PartialSearchFieldOptions; // Options for the search field
  @property({ type: Boolean }) hideSuggestions: boolean = false; // Whether to hide suggestions from parent

  // ============================================================================
  // State Properties (Internal State)
  // ============================================================================
  @state() term: string = ''; // Input area value
  @state() value: string = ''; // Value of selected suggestion
  @state() label: string = ''; // Label of selected suggestion
  @state() showSuggestions: boolean = false; // Whether suggestions are displayed
  @state() currentSuggestionIndex: number = -1; // Position from top of selection
  @state() currentSuggestionColumnIndex: number = 0; // Position from side of selection
  @state() suggestData: { [key: string]: SuggestionData[] } = {}; // Suggest data list
  @state() private _suggestionKeysArrayInternal: string[] = []; // Suggest content keys

  // ============================================================================
  // Private Properties
  // ============================================================================
  private _controller: SearchFieldController;
  private _keyboardHandler: SuggestionKeyboardHandler;
  private _selectionHandler: SuggestionSelectionHandler;
  private _inputHandler: InputEventHandler;
  private _searchFieldOptionsInternal: SearchFieldOptions;

  // ============================================================================
  // Constructor
  // ============================================================================
  /**
   * @param placeholder - Placeholder text
   * @param suggestAPIURL - URL to fetch suggestions from
   * @param suggestAPIQueryParam - Query parameter to be used for the API call
   * @param element - HTML element to which the search field is attached
   * @param options - Options for the search field
   */
  constructor(
    public placeholder: string,
    suggestAPIURL: string,
    suggestAPIQueryParam: string,
    element?: HTMLElement,
    options?: PartialSearchFieldOptions
  ) {
    super();
    this.suggestAPIURL = suggestAPIURL;
    this.suggestAPIQueryParam = suggestAPIQueryParam;

    // デフォルト値とマージして完全なSearchFieldOptionsを作成
    this._searchFieldOptionsInternal = {
      valueMappings: {
        valueKey: options?.valueMappings?.valueKey || 'id',
        labelKey: options?.valueMappings?.labelKey || 'term',
        aliasOfKey: options?.valueMappings?.aliasOfKey || 'alias_of',
      },
      titleMappings: options?.titleMappings || {},
    };

    // 初期化
    this._controller = new SearchFieldController(this);
    this._keyboardHandler = new SuggestionKeyboardHandler(this);
    this._selectionHandler = new SuggestionSelectionHandler(this);
    this._inputHandler = new InputEventHandler(this);

    // for only gene
    if (element) element.appendChild(this);
  }

  // ============================================================================
  // Getters
  // ============================================================================
  /** API task getter　- provides access to the suggestion fetching task */
  get apiTask() {
    return this._controller.apiTask;
  }

  /** Get search field options for handlers */
  get _searchFieldOptions() {
    return this._searchFieldOptionsInternal;
  }

  /** Get suggestion keys array for handlers */
  get _suggestionKeysArray() {
    return this._suggestionKeysArrayInternal;
  }

  /** Set suggestion keys array for handlers */
  set _suggestionKeysArray(value: string[]) {
    this._suggestionKeysArrayInternal = value;
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================
  /** Compute property values that depend on other properties and are used in the rest of the update process */
  willUpdate(changedProperties: Map<string | number | symbol, unknown>): void {
    if (changedProperties.has('suggestAPIURL')) {
      this._controller.setSuggestURL(
        this.suggestAPIURL,
        this.suggestAPIQueryParam
      );
    }

    if (changedProperties.has('options') && this.options) {
      // 部分的なオプションを完全なSearchFieldOptionsに変換
      this._searchFieldOptionsInternal = {
        valueMappings: {
          valueKey: this.options.valueMappings?.valueKey || 'id',
          labelKey: this.options.valueMappings?.labelKey || 'term',
          aliasOfKey: this.options.valueMappings?.aliasOfKey || 'alias_of',
        },
        titleMappings: this.options.titleMappings || {},
      };
    }

    if (changedProperties.has('hideSuggestions')) {
      this.showSuggestions = !this.hideSuggestions;
    }
  }

  // ============================================================================
  // Public Event Handlers
  // ============================================================================
  /** Select with keydown(ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Enter, Escape) */
  handleUpDownKeys = (e: KeyboardEvent): void => {
    return this._keyboardHandler.handleUpDownKeys(e);
  };

  /** Handle suggestion selected event */
  handleSuggestionSelected = (e: CustomEvent<SuggestionData>): void => {
    return this._selectionHandler.handleSuggestionSelected(e);
  };

  /** Put the characters input in this.term, (Only SimpleSearch)create input-term event, hide suggestions if the length is less than 3, and empty suggestData */
  handleInput = (e: CustomEvent<string>): void => {
    return this._inputHandler.handleInput(e);
  };

  /** Initialize currentSuggestion position when input is clicked. */
  handleClick = (): void => {
    return this._inputHandler.handleClick();
  };

  /** Display suggestions, if the input character is greater than 3 when the focus on. */
  handleFocusIn = (): void => {
    return this._inputHandler.handleFocusIn();
  };

  /** Hide suggestions when focus moves away from input */
  handleFocusOut = (): void => {
    return this._inputHandler.handleFocusOut();
  };

  /** Hide suggestions and empty input when input is reset. input-reset event for simple search */
  handleInputReset = (): void => {
    return this._inputHandler.handleInputReset();
  };

  /** Hide suggestions */
  hideSuggestionsMethod = (): void => {
    this.showSuggestions = false;
  };

  // ============================================================================
  // Protected Methods (Used by Handlers)
  // ============================================================================
  /** Put the selected value in value and label, create new-suggestion-selected event, and hide suggestion */
  protected _select = (suggestion: SuggestionData): void => {
    return this._selectionHandler.select(suggestion);
  };

  /** (Only SimpleSearch) Search without suggestions, create search-term-enter event and hide suggest after event firing */
  protected _apiWithoutSelect = (term: string): void => {
    return this._selectionHandler.searchWithoutSelect(term);
  };

  /** Handle index of column */
  protected _handleStepThroughColumns(): void {
    // 列間のインデックス調整を処理
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

  // ============================================================================
  // Render Method
  // ============================================================================

  render(): TemplateResult {
    return html`
      <search-field
        exportparts="input-field"
        value=${this.term}
        .placeholder=${this.placeholder}
        @input-change=${this.handleInput}
        @click=${this.handleClick}
        @focusin=${this.handleFocusIn}
        @focusout=${this.handleFocusOut}
        @keydown=${this.handleUpDownKeys}
        @input-reset=${this.handleInputReset}
      ></search-field>
      <div class="suggestions-container">
        ${this.suggestData && this.showSuggestions
          ? html`
              ${map(
                this._suggestionKeysArray,
                (key: string, keyIndex: number) => {
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
                        @suggestion-selected=${this.handleSuggestionSelected}
                      ></search-field-suggestions-list>
                    </div>
                  `;
                }
              )}
            `
          : nothing}
      </div>
    `;
  }
}

export default SearchFieldWithSuggestions;
