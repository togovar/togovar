import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../suggestions/SearchFieldWithSuggestions';
import './SimpleSearchExamples.ts';
import './SimpleSearchButton.ts';
import { getSimpleSearchCondition } from '../../../../store/searchManager';
import { SimpleSearchController } from './SimpleSearchController.ts';
import { SimpleSearchEventHandlers } from './SimpleSearchEventHandlers.ts';
import { EXAMPLES, SEARCH_FIELD_CONFIG } from './SimpleSearchConstants.ts';

import Styles from '../../../../../stylesheets/object/component/simple-search-view.scss';

/**
 * SimpleSearchView - シンプル検索のメインコンポーネント
 * ビジネスロジックとイベントハンドリングは別クラスに委譲
 */
@customElement('simple-search-view')
class SimpleSearchView extends LitElement {
  static styles = [Styles];

  constructor() {
    super();
    document.getElementById('SimpleSearchView').appendChild(this);

    // コントローラーとイベントハンドラーを初期化
    this._controller = new SimpleSearchController(this);
    this._eventHandlers = new SimpleSearchEventHandlers(this, this._controller);
  }

  // ============================================================================
  // State Properties
  // ============================================================================

  /** @property {string} _value - サジェストの選択値 */
  @state() _value;

  /** @property {string} _term - 入力値 */
  @state() _term = getSimpleSearchCondition('term');

  /** @property {boolean} _hideSuggestions - サジェストを非表示にするかどうか */
  @state() _hideSuggestions = true;

  // ============================================================================
  // Getter Methods (Controller Access)
  // ============================================================================

  /** コントローラーへのアクセサ */
  get controller() {
    return this._controller;
  }

  /** イベントハンドラーへのアクセサ */
  get eventHandlers() {
    return this._eventHandlers;
  }

  // ============================================================================
  // Event Handler Methods
  // ============================================================================

  /** 検索ボタンクリック時の処理 */
  _handleSearchButtonClick = () => {
    this._eventHandlers.handleSearchButtonClick();
  };

  /** 例文選択時の処理 */
  _handleExampleSelected = (e) => {
    this._eventHandlers.handleExampleSelected(e);
  };

  // ============================================================================
  // Render Method
  // ============================================================================

  render() {
    return html`
      <div class="simple-search-container">
        <search-field-with-suggestions
          exportparts="input-field"
          .placeholder=${SEARCH_FIELD_CONFIG.placeholder}
          .suggestAPIURL=${SEARCH_FIELD_CONFIG.suggestAPIURL}
          .suggestAPIQueryParam=${SEARCH_FIELD_CONFIG.suggestAPIQueryParam}
          .options=${SEARCH_FIELD_CONFIG.options}
          .term=${this._term}
          .hideSuggestions=${this._hideSuggestions}
          @new-suggestion-selected=${this._eventHandlers.handleSuggestionEnter}
          @search-term-enter=${this._eventHandlers.handleTermEnter}
          @input-term=${this._eventHandlers.handleInputTerm}
          @input=${this._eventHandlers.handleInputStart}
          @input-reset=${this._eventHandlers.handleInputReset}
        ></search-field-with-suggestions>

        <search-button @click=${this._handleSearchButtonClick}></search-button>
      </div>
      <simple-search-examples
        .examples=${EXAMPLES}
        @example-selected=${this._handleExampleSelected}
      ></simple-search-examples>
    `;
  }
}

export default SimpleSearchView;
