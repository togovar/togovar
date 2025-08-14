import { storeManager } from '../../../../../store/StoreManager';

/**
 * SuggestionKeyboardHandler - キーボードナビゲーションとキー操作を担当するクラス
 */
export class SuggestionKeyboardHandler {
  /**
   * @param {LitElement} host - ホストとなるLitElementインスタンス
   */
  constructor(host) {
    this.host = host;
  }

  /**
   * キーボードイベント（ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Enter, Escape）を処理
   * @param {Event} e - キーボードイベント
   * @returns {void}
   */
  handleUpDownKeys = (e) => {
    if (!this.host.showSuggestions) {
      storeManager.setData('showSuggest', false);
    }

    const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (
      arrowKeys.includes(e.key) &&
      this.host.showSuggestions &&
      this.host.currentSuggestionIndex !== -1
    ) {
      e.preventDefault();
    }

    switch (e.key) {
      case 'ArrowLeft':
        this._handleArrowLeft();
        break;

      case 'ArrowRight':
        this._handleArrowRight();
        break;

      case 'ArrowUp':
        this._handleArrowUp();
        break;

      case 'ArrowDown':
        this._handleArrowDown();
        break;

      case 'Enter':
        this._handleEnter();
        break;

      case 'Escape':
        this._handleEscape();
        break;

      default:
        break;
    }
  };

  /**
   * 左矢印キーの処理 - 列の左移動
   * @private
   */
  _handleArrowLeft() {
    if (this.host.currentSuggestionColumnIndex - 1 < 0) {
      this.host.currentSuggestionColumnIndex =
        this.host._suggestionKeysArray?.length - 1;
      return;
    }
    this.host.currentSuggestionColumnIndex--;
    this._handleStepThroughColumns();
  }

  /**
   * 右矢印キーの処理 - 列の右移動
   * @private
   */
  _handleArrowRight() {
    if (
      this.host.currentSuggestionColumnIndex + 1 >
      this.host._suggestionKeysArray?.length - 1
    ) {
      this.host.currentSuggestionColumnIndex = 0;
      return;
    }
    this.host.currentSuggestionColumnIndex++;
    this._handleStepThroughColumns();
  }

  /**
   * 上矢印キーの処理 - 行の上移動
   * @private
   */
  _handleArrowUp() {
    if (this.host.currentSuggestionIndex - 1 < 0) {
      this.host.currentSuggestionIndex =
        this.host.suggestData[
          this.host._suggestionKeysArray[this.host.currentSuggestionColumnIndex]
        ]?.length - 1;
      return;
    }
    this.host.currentSuggestionIndex--;
  }

  /**
   * 下矢印キーの処理 - 行の下移動
   * @private
   */
  _handleArrowDown() {
    if (
      this.host.currentSuggestionIndex + 1 >
      this.host.suggestData[
        this.host._suggestionKeysArray[this.host.currentSuggestionColumnIndex]
      ]?.length -
        1
    ) {
      this.host.currentSuggestionIndex = 0;
      return;
    }
    this.host.currentSuggestionIndex++;
  }

  /**
   * Enterキーの処理 - 選択または検索実行
   * ホストのメソッドを呼び出してビジネスロジックを実行
   * @private
   */
  _handleEnter() {
    if (this.host.showSuggestions && this.host.currentSuggestionIndex !== -1) {
      // サジェストが選択されている場合：選択処理を実行
      this.host._select(
        this.host.suggestData[
          this.host._suggestionKeysArray[this.host.currentSuggestionColumnIndex]
        ][this.host.currentSuggestionIndex]
      );
      [
        this.host.currentSuggestionIndex,
        this.host.currentSuggestionColumnIndex,
      ] = [-1, 0];
      this.host._hideSuggestions();
    } else {
      // サジェストが選択されていない場合：直接検索を実行
      this.host._apiWithoutSelect(this.host.term);
    }
  }

  /**
   * Escapeキーの処理 - サジェスト非表示
   * @private
   */
  _handleEscape() {
    this.host._hideSuggestions();
  }

  /**
   * 列間のインデックス調整を処理
   * @private
   */
  _handleStepThroughColumns() {
    if (
      this.host.currentSuggestionIndex >
      this.host.suggestData[
        this.host._suggestionKeysArray[this.host.currentSuggestionColumnIndex]
      ]?.length -
        1
    ) {
      this.host.currentSuggestionIndex =
        this.host.suggestData[
          this.host._suggestionKeysArray[this.host.currentSuggestionColumnIndex]
        ]?.length - 1;
    }
  }

  /**
   * 選択位置を初期化
   */
  resetSelection() {
    this.host.currentSuggestionIndex = -1;
    this.host.currentSuggestionColumnIndex = 0;
  }
}
