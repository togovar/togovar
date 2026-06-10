import type {
  SuggestionData,
  SearchFieldHost,
} from '../SearchFieldWithSuggestions';

/** 候補選択と検索実行の責務を切り出したクラス。SearchFieldWithSuggestionsが肥大化しないようハンドラとして分離している */
export class SuggestionSelectionHandler {
  private host: SearchFieldHost;

  /**
   * thisを渡すことでホストの状態を読み書きできるようにする
   */
  constructor(host: SearchFieldHost) {
    this.host = host;
  }

  /**
   * 候補を確定して値・ラベルをホストに反映し、新しい選択を親へ通知する。
   * 選択後はサジェストが再度開かないようsuppressSuggestionsをtrueにする
   */
  select = (suggestion: SuggestionData): void => {
    const rawValue =
      suggestion[this.host._searchFieldOptions.valueMappings.valueKey];
    const rawLabel =
      suggestion[this.host._searchFieldOptions.valueMappings.labelKey];

    // インデックス署名がunknownのため、string型へ絞り込んでからフォーマットに渡す
    this.host.value = this._formatSuggestionValue(
      typeof rawValue === 'string' ? rawValue : ''
    );
    this.host.label = this._formatSuggestionValue(
      typeof rawLabel === 'string' ? rawLabel : ''
    );

    this.host.suppressSuggestions = true;
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
   * SimpleSearch専用。サジェストを選ばずにそのまま入力語で検索する。
   * 検索後もサジェストが再表示されないようsuppressSuggestionsをtrueにする
   */
  searchWithoutSelect = (term: string): void => {
    this.host.suppressSuggestions = true;
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
   * search-field-suggestions-listからのイベントを受け取りselectへ委譲する
   */
  handleSuggestionSelected = (e: CustomEvent<SuggestionData>): void => {
    this.select(e.detail);
  };

  /**
   * 列が複数あるかどうかでSimpleSearchモードかを判定する。
   * SimpleSearchは遺伝子・疾患など複数種類の候補を複数列で表示するため、1列かどうかで種別を区別できる
   */
  private _hasMultipleSuggestionColumns(): boolean {
    return this.host._suggestionKeysArray.length > 1;
  }

  /**
   * ダブルクォートやバックスラッシュをエスケープして検索クエリを壊さないようにする
   */
  private _escapeString(str: string | undefined): string {
    return String(str || '')
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"');
  }

  /**
   * SimpleSearch（複数列）ではダブルクォートで囲んで完全一致にする。
   * 遺伝子名や疾患名など複数候補種別が混在する場合、曖昧検索だと無関係な候補を拾うリスクがあるため
   */
  private _formatSuggestionValue(value: string): string {
    const escapedValue = this._escapeString(value);
    return this._hasMultipleSuggestionColumns()
      ? `"${escapedValue}"`
      : escapedValue;
  }
}
