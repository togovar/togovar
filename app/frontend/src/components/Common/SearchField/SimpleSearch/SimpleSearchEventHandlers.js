/**
 * SimpleSearchEventHandlers - SimpleSearchViewのイベントハンドラーを担当
 */
export class SimpleSearchEventHandlers {
  constructor(host, controller) {
    this.host = host;
    this.controller = controller;
  }

  /**
   * サジェスト選択イベントの処理
   * @param {CustomEvent} e - new-suggestion-selected イベント
   */
  handleSuggestionEnter = (e) => {
    this.controller.selectSuggestion(e.detail);
  };

  /**
   * 例文選択イベントの処理
   * @param {CustomEvent} e - example-selected イベント
   */
  handleExampleSelected = (e) => {
    this.controller.selectExample(e.detail);
  };

  /**
   * 入力イベントの処理
   * @param {CustomEvent} e - input-term イベント
   */
  handleInputTerm = (e) => {
    this.controller.updateTerm(e.detail);
  };

  /**
   * Enterキー押下時の検索実行
   */
  handleTermEnter = () => {
    this.controller.executeCurrentSearch();
  };

  /**
   * 検索ボタンクリック時の処理
   */
  handleSearchButtonClick = () => {
    this.controller.executeButtonSearch();
  };

  /**
   * 入力フィールドでの入力開始時の処理
   */
  handleInputStart = () => {
    this.host._hideSuggestions = false;
  };

  /**
   * リセットボタンクリック時の処理
   */
  handleInputReset = () => {
    this.controller.reset();
  };
}
