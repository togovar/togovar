import { SuggestionData, SearchFieldHost } from '../SearchFieldWithSuggestions';

/**
 * SuggestionSelectionHandler - サジェストの選択と検索実行を担当するクラス
 */
export class SuggestionSelectionHandler {
  private host: SearchFieldHost;

  /**
   * @param host - ホストとなるLitElementインスタンス
   */
  constructor(host: SearchFieldHost) {
    this.host = host;
  }

  /**
   * サジェストを選択して値を設定
   * @param suggestion - 選択されたサジェスト
   */
  select = (suggestion: SuggestionData): void => {
    const valueKey =
      suggestion[this.host._searchFieldOptions.valueMappings.valueKey] || '';
    const labelKey =
      suggestion[this.host._searchFieldOptions.valueMappings.labelKey] || '';

    // サジェストの値をフォーマットして設定
    this.host.value = this._formatSuggestionValue(valueKey);
    this.host.label = this._formatSuggestionValue(labelKey);

    // サジェスト選択後はサジェストを抑制
    this.host.suppressSuggestions = true;
    // サジェスト選択後はユーザー入力フラグもリセット
    this.host.hasUserInput = false;

    this.host.dispatchEvent(
      new CustomEvent('new-suggestion-selected', {
        detail: { id: this.host.value, label: this.host.label },
        bubbles: true,
        composed: true,
      })
    );
  };

  /**
   * (Only SimpleSearch) サジェストなしで検索を実行
   * @param term - 検索語
   */
  searchWithoutSelect = (term: string): void => {
    // 検索実行後はサジェストを抑制
    this.host.suppressSuggestions = true;
    // 検索実行後はユーザー入力フラグもリセット
    this.host.hasUserInput = false;

    this.host.dispatchEvent(
      new CustomEvent('search-term-enter', {
        detail: term,
        bubbles: true,
        composed: true,
      })
    );
    this.host.hideSuggestionsMethod();
  };

  /**
   * サジェスト選択イベントを処理
   * @param e - サジェスト選択イベント
   */
  handleSuggestionSelected = (e: CustomEvent<SuggestionData>): void => {
    this.select(e.detail);
  };

  /**
   * 複数のサジェストカラムが存在するかチェック
   * 複数カラムの場合はSimpleSearchモードとしてダブルクォートを追加する
   * @returns 複数カラムの場合はtrue、単一カラム（gene, diseaseなど）の場合はfalse
   */
  private _hasMultipleSuggestionColumns(): boolean {
    return this.host._suggestionKeysArray.length > 1;
  }

  /**
   * 文字列をエスケープする
   * @param str - エスケープする文字列
   * @returns エスケープされた文字列
   */
  private _escapeString(str: string | undefined): string {
    return String(str || '')
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"');
  }

  /**
   * サジェスト値を適切にフォーマットする
   * 
   * SimpleSearchモード（複数カラム）の場合：
   * - ダブルクォートで囲む（完全一致検索のため）
   * - 複数の検索対象（遺伝子、疾患など）が混在するため、明示的な区切りが必要
   * 
   * 特定検索モード（gene, diseaseなど単一カラム）の場合：
   * - クォートなし（部分一致検索を許可）
   * - 検索対象が特定されているため、より柔軟な検索が可能
   * 
   * @param value - フォーマットする値
   * @returns フォーマットされた値
   */
  private _formatSuggestionValue(value: string): string {
    const escapedValue = this._escapeString(value);
    
    if (this._hasMultipleSuggestionColumns()) {
      // SimpleSearchモード: ダブルクォートで囲んで完全一致検索
      return `"${escapedValue}"`;
    } else {
      // 特定検索モード: クォートなしで部分一致検索を許可
      return escapedValue;
    }
  }
}
