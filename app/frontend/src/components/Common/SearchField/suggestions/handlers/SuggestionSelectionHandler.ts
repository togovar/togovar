import { LitElement } from 'lit';

/** Suggestion data structure */
interface SuggestionData {
  term?: string;
  alias_of?: string;
  highlight?: string;
  id?: string;
  name?: string;
  symbol?: string;
  [key: string]: any;
}

/** Search field options interface */
interface SearchFieldOptions {
  valueMappings: {
    valueKey: string;
    labelKey: string;
    aliasOfKey?: string;
  };
  titleMappings?: { [key: string]: string };
}

/** Host interface for SearchFieldWithSuggestions */
interface SearchFieldHost extends LitElement {
  _searchFieldOptions: SearchFieldOptions;
  _suggestionKeysArray: string[];
  value: string;
  label: string;
  _hideSuggestions(): void;
  dispatchEvent(event: CustomEvent): boolean;
}

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
    const escapeString = (str: string | undefined): string =>
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
   * @param term - 検索語
   */
  searchWithoutSelect = (term: string): void => {
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
   * @param e - サジェスト選択イベント
   */
  handleSuggestionSelected = (e: CustomEvent<SuggestionData>): void => {
    this.select(e.detail);
  };
}
