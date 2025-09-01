import { setSimpleSearchCondition } from '../../../store/searchManager';
import { storeManager } from '../../../store/StoreManager';
import { CHROMOSOME_PATTERN } from './SimpleSearchConstants';
import {
  SimpleSearchHost,
  SuggestionItem,
  ExampleItem,
} from './SimpleSearchTypes';

/**
 * SimpleSearchController - SimpleSearchViewのビジネスロジックを担当
 */
export class SimpleSearchController {
  private host: SimpleSearchHost;

  constructor(host: SimpleSearchHost) {
    this.host = host;
  }

  /**
   * 検索処理
   * 染色体パターンの正規化も行う
   * @param term - 検索語
   */
  search(term: string): void {
    if (CHROMOSOME_PATTERN.test(term)) {
      term = term.replace(/Chr|ch|Cr|cs/i, '').toUpperCase();

      if (term.includes('M:')) {
        term = term.replace('M:', 'MT:');
      }
    }

    setSimpleSearchCondition('term', term);
  }

  /**
   * 入力項目の更新
   * @param term - 入力値
   */
  updateTerm(term: string): void {
    this.host._term = term;

    // 入力されたテキストを検索条件に反映する（ただし検索は実行しない）
    const currentConditions = {
      ...storeManager.getData('simpleSearchConditions'),
    };
    // 空文字列も適切に処理
    currentConditions.term = term || '';
    storeManager.setData('simpleSearchConditions', currentConditions);
  }

  /** 検索状態のリセット */
  reset(): void {
    this.host._term = '';
    this.host._value = '';
    this.host._hideSuggestions = true;

    // 検索条件を更新して空の検索を実行
    setSimpleSearchCondition('term', '');
  }

  /**
   * サジェスト選択時の処理
   * @param suggestion - 選択されたサジェスト
   */
  selectSuggestion(suggestion: SuggestionItem): void {
    this.host._hideSuggestions = true;
    this.host._value = suggestion.label;
    this.host._term = suggestion.label;
    this.search(suggestion.label);
  }

  /**
   * 例文選択時の処理
   * @param example - 選択された例文
   */
  selectExample(example: ExampleItem): void {
    this.host._hideSuggestions = true;
    this.host._value = example.value;
    this.host._term = example.value;
    this.search(example.value);
  }

  /**
   * 現在の検索項目を使用して検索実行
   */
  executeCurrentSearch(): void {
    if (this.host._term === undefined) return;
    this.search(this.host._term);
  }

  /**
   * ボタンクリック時の検索実行
   */
  executeButtonSearch(): void {
    this.search(this.host._term || '');
  }
}
