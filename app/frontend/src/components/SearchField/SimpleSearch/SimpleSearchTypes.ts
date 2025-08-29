/**
 * SimpleSearch関連の型定義
 */

/** SimpleSearchHostインターフェース - 型安全な定義 */
export interface SimpleSearchHost {
  /** 検索キーワード */
  _term: string;
  /** 選択されたサジェストの値 */
  _value: string;
  /** サジェストを非表示にするかどうか */
  _hideSuggestions: boolean;
}

/** サジェストアイテムの型 */
export interface SuggestionItem {
  /** 表示ラベル */
  label: string;
  /** サジェストID（オプション） */
  id?: string;
  /** その他のメタデータ（オプション） */
  term?: string;
  symbol?: string;
  name?: string;
  alias_of?: string;
  highlight?: string;
}

/** 例文アイテムの型 */
export interface ExampleItem {
  /** 例文の値 */
  value: string;
  /** 例文のラベル（オプション） */
  label?: string;
}

/** Controller インターフェース */
export interface SimpleSearchControllerInterface {
  selectSuggestion(suggestion: SuggestionItem): void;
  selectExample(example: ExampleItem): void;
  updateTerm(term: string): void;
  executeCurrentSearch(): void;
  executeButtonSearch(): void;
  reset(): void;
}
