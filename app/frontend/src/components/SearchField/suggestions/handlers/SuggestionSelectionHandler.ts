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

    // SimpleSearchの場合のみダブルクォートを付け、gene, diseaseの場合は付けない
    if (this._isSimpleSearch()) {
      this.host.value = `"${this._escapeString(valueKey)}"`;
      this.host.label = `"${this._escapeString(labelKey)}"`;
    } else {
      this.host.value = this._escapeString(valueKey);
      this.host.label = this._escapeString(labelKey);
    }

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
   * 現在の検索フィールドがSimpleSearchモードかどうかを判定
   * @returns SimpleSearchの場合はtrue、それ以外（gene, diseaseなど）の場合はfalse
   */
  private _isSimpleSearch(): boolean {
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
}
