import { LitElement, html, CSSResultGroup, TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../suggestions/SearchFieldWithSuggestions';
import './SimpleSearchExamples';
import './SimpleSearchButton';
import { getSimpleSearchCondition } from '../../../store/searchManager';
import { SimpleSearchController } from './SimpleSearchController';
import { SimpleSearchEventHandlers } from './SimpleSearchEventHandlers';
import { EXAMPLES, SEARCH_FIELD_CONFIG } from './SimpleSearchConstants';
import Styles from '../../../../stylesheets/object/component/simple-search-view.scss';

/**
 * SimpleSearchView - シンプル検索のメインコンポーネント
 * ビジネスロジックとイベントハンドリングは別クラスに委譲
 */
@customElement('simple-search-view')
class SimpleSearchView extends LitElement {
  static styles: CSSResultGroup = [Styles];

  private _controller: SimpleSearchController;
  private _eventHandlers: SimpleSearchEventHandlers;

  constructor() {
    super();
    const element = document.getElementById('SimpleSearchView');
    if (element) {
      element.appendChild(this);
    }

    // コントローラーとイベントハンドラーを初期化
    this._controller = new SimpleSearchController(this);
    this._eventHandlers = new SimpleSearchEventHandlers(this, this._controller);
  }

  // ============================================================================
  // State Properties
  // ============================================================================
  @state() _value: string = ''; // 選択されたサジェストの値
  @state() _term: string = getSimpleSearchCondition('term') || ''; // 検索キーワード
  @state() _hideSuggestions: boolean = true; // サジェストを非表示にするかどうか

  // ============================================================================
  // Getter Methods (Controller Access)
  // ============================================================================

  /** コントローラーへのアクセサ */
  get controller(): SimpleSearchController {
    return this._controller;
  }

  /** イベントハンドラーへのアクセサ */
  get eventHandlers(): SimpleSearchEventHandlers {
    return this._eventHandlers;
  }

  // ============================================================================
  // Event Handler Methods
  // ============================================================================

  /** 検索ボタンクリック時の処理 */
  private _handleSearchButtonClick = (): void => {
    this._eventHandlers.handleSearchButtonClick();
  };

  /** 例文選択時の処理 */
  private _handleExampleSelected = (e: CustomEvent): void => {
    this._eventHandlers.handleExampleSelected(e);
  };

  // ============================================================================
  // Render Method
  // ============================================================================

  render(): TemplateResult {
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
