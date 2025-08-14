/**
 * SuggestionSelectionHandler - サジェストの選択と検索実行を担当するクラス
 */
export class SuggestionSelectionHandler {
  /**
   * @param {LitElement} host - ホストとなるLitElementインスタンス
   */
  constructor(host) {
    this.host = host;
  }

  /**
   * サジェストを選択して値を設定
   * @param {Object} suggestion - 選択されたサジェスト
   */
  select = (suggestion) => {
    const escapeString = (str) =>
      String(str || '')
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"');

    const valueKey =
      suggestion[this.host._searchFieldOptions.valueMappings.valueKey] || '';
    const labelKey =
      suggestion[this.host._searchFieldOptions.valueMappings.labelKey] || '';

    // SimpleSearchの場合のみダブルクォートを付ける
    // gene, diseaseの場合は付けない
    const isSimpleSearch = this.host._suggestionKeysArray.length > 1;

    if (isSimpleSearch) {
      this.host.value = `"${escapeString(valueKey)}"`;
      this.host.label = `"${escapeString(labelKey)}"`;
    } else {
      this.host.value = escapeString(valueKey);
      this.host.label = escapeString(labelKey);
    }

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
   * @param {string} term - 検索語
   */
  searchWithoutSelect = (term) => {
    this.host.dispatchEvent(
      new CustomEvent('search-term-enter', {
        detail: term,
        bubbles: true,
        composed: true,
      })
    );
    this.host._hideSuggestions();
  };

  /**
   * サジェスト選択イベントを処理
   * @param {Event} e - サジェスト選択イベント
   */
  handleSuggestionSelected = (e) => {
    this.select(e.detail);
  };
}
