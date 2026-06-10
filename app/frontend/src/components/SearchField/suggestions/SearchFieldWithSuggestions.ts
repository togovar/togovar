import { LitElement, html, nothing } from 'lit';
import type {
  ReactiveControllerHost,
  CSSResultGroup,
  TemplateResult,
} from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';

import '../SearchField';
import './SearchFieldSuggestionsList';
import { SearchFieldController } from './handlers/SearchFieldController';
import { SuggestionKeyboardHandler } from './handlers/SuggestionKeyboardHandler';
import { SuggestionSelectionHandler } from './handlers/SuggestionSelectionHandler';
import { InputEventHandler } from './handlers/InputEventHandler';

import Styles from '../../../../stylesheets/object/component/search-field-with-suggestions.scss';

/**
 * APIレスポンスのキー名が変わっても一か所で対応できるよう、デフォルトのキーマッピングをconstで管理する
 */
const DEFAULT_VALUE_MAPPINGS = {
  valueKey: 'id',
  labelKey: 'term',
  aliasOfKey: 'alias_of',
} as const;

/**
 * 部分的なオプションをデフォルト値で補完し、完全なSearchFieldOptionsを返す。
 * 呼び出し元で毎回デフォルト値を記述しなくて済むよう純粋関数として切り出している
 */
function createCompleteSearchFieldOptions(
  options?: Partial<SearchFieldOptions>
): SearchFieldOptions {
  return {
    valueMappings: {
      valueKey:
        options?.valueMappings?.valueKey || DEFAULT_VALUE_MAPPINGS.valueKey,
      labelKey:
        options?.valueMappings?.labelKey || DEFAULT_VALUE_MAPPINGS.labelKey,
      aliasOfKey:
        options?.valueMappings?.aliasOfKey || DEFAULT_VALUE_MAPPINGS.aliasOfKey,
    },
    titleMappings: options?.titleMappings || {},
  };
}

/**
 * APIから返るサジェスト候補の共通構造。
 * エンドポイントによってキーが異なるため汎用インデックス型を持つが、
 * anyを避けてunknownにすることで意図しない型操作を防ぐ
 */
export interface SuggestionData {
  term?: string;
  alias_of?: string;
  highlight?: string;
  id?: string;
  name?: string;
  symbol?: string;
  [key: string]: unknown;
}

/** サジェスト候補の表示・選択動作を設定するオプション */
export interface SearchFieldOptions {
  /** 候補データのどのキーを値・ラベル・補足テキストとして扱うかのマッピング */
  valueMappings: {
    valueKey: string;
    labelKey: string;
    aliasOfKey?: string;
  };
  /** 候補リストの列見出しマッピング（複数列表示時に使用） */
  titleMappings?: { [key: string]: string };
}

/**
 * ハンドラクラスがSearchFieldWithSuggestionsの状態を操作できるよう、
 * 必要なプロパティとメソッドをインターフェースとして公開する
 */
export interface SearchFieldHost extends ReactiveControllerHost {
  _searchFieldOptions: SearchFieldOptions;
  _suggestionKeysArray: string[];
  value: string;
  label: string;
  term: string;
  showSuggestions: boolean;
  suppressSuggestions: boolean;
  hasApiResponse: boolean;
  hasUserInput: boolean;
  currentSuggestionIndex: number;
  currentSuggestionColumnIndex: number;
  suggestData: { [key: string]: SuggestionData[] };
  hideSuggestionsMethod(): void;
  selectSuggestion(suggestion: SuggestionData): void;
  searchWithoutSuggestion(term: string): void;
  selectCurrentSuggestion(): void;
  executeSearchWithoutSuggestion(): void;
  closeSuggestions(): void;
  hideControllerSuggestions(): void;
  showControllerSuggestions(): void;
  clearControllerSuggestData(): void;
  resetKeyboardSelection(): void;
  dispatchEvent(event: CustomEvent): boolean;
}

/**
 * aliasOfKeyのみ省略可能にした呼び出し側向けの簡易オプション型。
 * SearchFieldOptionsを直接使うと全フィールドが必須になるため別途定義している
 */
export type PartialSearchFieldOptions = {
  valueMappings: Partial<SearchFieldOptions['valueMappings']> & {
    valueKey: string;
    labelKey: string;
  };
  titleMappings?: { [key: string]: string };
};

/**
 * サジェスト機能付き検索フィールドのカスタムエレメント。
 * SimpleSearchView・ConditionValueEditorGene・ConditionValueEditorDiseaseから使われる
 */
@customElement('search-field-with-suggestions')
class SearchFieldWithSuggestions extends LitElement {
  static styles: CSSResultGroup = [Styles];

  @property() suggestAPIURL: string = '';
  @property() suggestAPIQueryParam: string = '';
  @property({ type: Object }) options?: PartialSearchFieldOptions;
  /** 親コンポーネントがサジェストを強制的に非表示にするためのフラグ */
  @property({ type: Boolean }) hideSuggestions: boolean = false;

  @state() term: string = '';
  @state() value: string = '';
  @state() label: string = '';
  @state() showSuggestions: boolean = false;
  /** 検索実行後に再びサジェストが開くのを防ぐフラグ */
  @state() suppressSuggestions: boolean = false;
  @state() hasApiResponse: boolean = false;
  @state() hasUserInput: boolean = false;
  /** キー操作のハイライト行（-1は未選択） */
  @state() currentSuggestionIndex: number = -1;
  @state() currentSuggestionColumnIndex: number = 0;
  @state() suggestData: { [key: string]: SuggestionData[] } = {};
  /**
   * getter/setterでラップするため内部用変数として分離している。
   * ハンドラからはgetter経由でアクセスする
   */
  @state() private _suggestionKeysArrayInternal: string[] = [];

  private _controller: SearchFieldController;
  private _keyboardHandler: SuggestionKeyboardHandler;
  private _selectionHandler: SuggestionSelectionHandler;
  private _inputHandler: InputEventHandler;
  private _searchFieldOptionsInternal: SearchFieldOptions;

  /**
   * 各ハンドラにthisを渡して初期化する。
   * elementが指定されている場合はGene条件入力専用として、要素に直接appendして使う
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
    this._searchFieldOptionsInternal =
      createCompleteSearchFieldOptions(options);
    this._controller = new SearchFieldController(this);
    this._keyboardHandler = new SuggestionKeyboardHandler(this);
    this._selectionHandler = new SuggestionSelectionHandler(this);
    this._inputHandler = new InputEventHandler(this);
    if (element) element.appendChild(this);
  }

  /**
   * ハンドラからcontrollerのapiTaskへアクセスできるよう公開する
   */
  get apiTask() {
    return this._controller.apiTask;
  }

  /**
   * ハンドラがSearchFieldOptionsを読み取れるよう内部インスタンスをラップして公開する
   */
  get _searchFieldOptions() {
    return this._searchFieldOptionsInternal;
  }

  /**
   * ハンドラが候補キー配列を読み取れるよう内部インスタンスをラップして公開する
   */
  get _suggestionKeysArray() {
    return this._suggestionKeysArrayInternal;
  }

  /**
   * ハンドラが候補キー配列を書き換えられるよう内部インスタンスをラップして公開する
   */
  set _suggestionKeysArray(value: string[]) {
    this._suggestionKeysArrayInternal = value;
  }

  /**
   * プロパティの変更に応じてコントローラーのURLや内部オプションを更新する。
   * willUpdateは再描画前に呼ばれるため、副作用のある処理を安全に行える
   */
  willUpdate(changedProperties: Map<string | number | symbol, unknown>): void {
    if (changedProperties.has('suggestAPIURL')) {
      this._controller.setSuggestURL(
        this.suggestAPIURL,
        this.suggestAPIQueryParam
      );
    }
    if (changedProperties.has('options') && this.options) {
      this._searchFieldOptionsInternal = createCompleteSearchFieldOptions(
        this.options
      );
    }
    if (changedProperties.has('hideSuggestions')) {
      this.showSuggestions = !this.hideSuggestions;
    }
  }

  /** キー操作（上下左右・Enter・Escape）をキーボードハンドラへ委譲する */
  handleUpDownKeys = (e: KeyboardEvent): void => {
    return this._keyboardHandler.handleUpDownKeys(e);
  };

  /** 候補選択イベントを選択ハンドラへ委譲する */
  handleSuggestionSelected = (e: CustomEvent<SuggestionData>): void => {
    return this._selectionHandler.handleSuggestionSelected(e);
  };

  /** 文字入力をインプットハンドラへ委譲する */
  handleInput = (e: InputEvent): void => {
    return this._inputHandler.handleInput(e);
  };

  /** クリック時のカーソル位置リセットをインプットハンドラへ委譲する */
  handleClick = (): void => {
    return this._inputHandler.handleClick();
  };

  /** フォーカスイン時のサジェスト表示をインプットハンドラへ委譲する */
  handleFocusIn = (): void => {
    return this._inputHandler.handleFocusIn();
  };

  /** フォーカスアウト時のサジェスト非表示をインプットハンドラへ委譲する */
  handleFocusOut = (): void => {
    return this._inputHandler.handleFocusOut();
  };

  /** 入力リセット時のサジェスト非表示と入力クリアをインプットハンドラへ委譲する */
  handleInputReset = (): void => {
    return this._inputHandler.handleInputReset();
  };

  /** ハンドラから直接呼べるようthisコンテキストを保持したままサジェストを非表示にする */
  hideSuggestionsMethod = (): void => {
    this.showSuggestions = false;
  };

  /** 候補を選択して選択値・ラベルを更新し、イベントを発火する */
  selectSuggestion = (suggestion: SuggestionData): void => {
    return this._selectionHandler.select(suggestion);
  };

  /** サジェスト非選択のまま検索を実行する（SimpleSearch専用） */
  searchWithoutSuggestion = (term: string): void => {
    return this._selectionHandler.searchWithoutSelect(term);
  };

  /**
   * キーボードでハイライト中の候補を選択して確定する。
   * サジェスト表示中かつ選択位置が有効な場合のみ動作する
   */
  selectCurrentSuggestion = (): void => {
    if (this.showSuggestions && this.currentSuggestionIndex !== -1) {
      const currentSuggestion =
        this.suggestData[
          this._suggestionKeysArray[this.currentSuggestionColumnIndex]
        ][this.currentSuggestionIndex];
      this.selectSuggestion(currentSuggestion);
      this.resetKeyboardSelection();
      this.hideSuggestionsMethod();
    }
  };

  /** 入力中のtermでサジェスト非選択のまま検索を実行する */
  executeSearchWithoutSuggestion = (): void => {
    this.searchWithoutSuggestion(this.term);
  };

  /** サジェストを閉じ、検索後に再び開くのを一時的に抑制する */
  closeSuggestions = (): void => {
    this.hideSuggestionsMethod();
    this.suppressSuggestions = true;
  };

  /** controllerのサジェスト非表示処理をハンドラから呼べるようラップする */
  hideControllerSuggestions = (): void => {
    this._controller.hideSuggestions();
  };

  /** controllerのサジェスト表示処理をハンドラから呼べるようラップする */
  showControllerSuggestions = (): void => {
    this._controller.showSuggestions();
  };

  /** controllerのサジェストデータクリア処理をハンドラから呼べるようラップする */
  clearControllerSuggestData = (): void => {
    this._controller.clearSuggestData();
  };

  /** キーボードのハイライト状態をリセットする */
  resetKeyboardSelection = (): void => {
    this._keyboardHandler.resetSelection();
  };

  /**
   * 複数列表示時、列をまたいだ場合のインデックス上限を調整する。
   * 列によってデータ件数が異なるため、現在の列の末尾に収める必要がある
   */
  protected _handleStepThroughColumns(): void {
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
        ${this.suggestData &&
        this.showSuggestions &&
        this.hasApiResponse &&
        !this.hideSuggestions
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
                        .hasApiResponse=${this.hasApiResponse}
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
