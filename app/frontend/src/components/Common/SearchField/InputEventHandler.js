import { storeManager } from '../../../store/StoreManager';

/**
 * InputEventHandler - 入力イベントの処理とフォーカス管理を担当するクラス
 */
export class InputEventHandler {
  /**
   * @param {LitElement} host - ホストとなるLitElementインスタンス
   */
  constructor(host) {
    this.host = host;
  }

  /**
   * 入力変更イベントを処理
   * @param {Event} e - 入力イベント
   */
  handleInput = (e) => {
    this.host.term = e.data;
    this.host.dispatchEvent(
      new CustomEvent('input-term', {
        detail: e.data,
        bubbles: true,
        composed: true,
      })
    );

    // 3文字未満の場合はサジェストを非表示
    if (this.host.term.length < 3) {
      this.host._controller.hideSuggestions();
      this.host._controller.clearSuggestData();
    }
  };

  /**
   * クリックイベントを処理 - サジェスト選択位置を初期化
   */
  handleClick = () => {
    this.host._keyboardHandler.resetSelection();
  };

  /**
   * フォーカスインイベントを処理 - 条件を満たす場合サジェストを表示
   */
  handleFocusIn = () => {
    if (this.host.term?.length > 3) {
      this.host._controller.showSuggestions();
    }
  };

  /**
   * フォーカスアウトイベントを処理 - サジェストを非表示
   */
  handleFocusOut = () => {
    this.host._hideSuggestions();
    storeManager.setData('showSuggest', false);
  };

  /**
   * 入力リセットイベントを処理 - すべてのフィールドをクリア
   */
  handleInputReset = () => {
    this.host.term = '';
    this.host.value = '';
    this.host.label = '';
    this.host.showSuggestions = false;
    this.host._controller.clearSuggestData();
    this.host._hideSuggestions();
    this.host.dispatchEvent(new CustomEvent('input-reset'));
  };

  /**
   * 入力フィールドの状態をリセット
   */
  resetInputState() {
    this.host.term = '';
    this.host.value = '';
    this.host.label = '';
  }

  /**
   * サジェスト表示の条件をチェック
   * @returns {boolean} サジェストを表示すべきかどうか
   */
  shouldShowSuggestions() {
    return this.host.term && this.host.term.length >= 3;
  }
}
