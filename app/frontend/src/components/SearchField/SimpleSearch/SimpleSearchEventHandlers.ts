/** SimpleSearchEventHandlers - SimpleSearchViewのイベントハンドラーを担当 */

import type {
  SimpleSearchHost,
  SimpleSearchControllerInterface,
  SuggestionItem,
  ExampleItem,
} from './SimpleSearchTypes';

export class SimpleSearchEventHandlers {
  private host: SimpleSearchHost;
  private controller: SimpleSearchControllerInterface;

  constructor(
    host: SimpleSearchHost,
    controller: SimpleSearchControllerInterface
  ) {
    this.host = host;
    this.controller = controller;
  }

  /**
   * サジェスト選択イベントの処理
   * @param e - new-suggestion-selected イベント
   */
  handleSuggestionEnter = (e: CustomEvent<SuggestionItem>): void => {
    this.controller.selectSuggestion(e.detail);
  };

  /**
   * 例文選択イベントの処理
   * @param e - example-selected イベント
   */
  handleExampleSelected = (e: CustomEvent<ExampleItem>): void => {
    this.controller.selectExample(e.detail);
  };

  /**
   * 入力イベントの処理
   * @param e - input-term イベント
   */
  handleInputTerm = (e: CustomEvent<string>): void => {
    this.controller.updateTerm(e.detail);
  };

  /** Enterキー押下時の検索実行 */
  handleTermEnter = (): void => {
    this.controller.executeCurrentSearch();
  };

  /** 検索ボタンクリック時の処理 */
  handleSearchButtonClick = (): void => {
    this.controller.executeButtonSearch();
  };

  /** 入力フィールドでの入力開始時の処理 */
  handleInputStart = (): void => {
    this.host._hideSuggestions = false;
  };

  /** リセットボタンクリック時の処理 */
  handleInputReset = (): void => {
    this.controller.reset();
  };
}
