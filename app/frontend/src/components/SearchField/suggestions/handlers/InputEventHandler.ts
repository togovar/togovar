import { SearchFieldHost } from '../SearchFieldWithSuggestions';

/** InputEventHandler - 入力イベントの処理とフォーカス管理を担当するクラス */
export class InputEventHandler {
  private host: SearchFieldHost;

  /** @param host - ホストとなるLitElementインスタンス */
  constructor(host: SearchFieldHost) {
    this.host = host;
  }

  /** 入力変更イベントを処理 */
  handleInput = (e: CustomEvent<string> | InputEvent): void => {
    // イベントの型に応じて適切なプロパティから値を取得
    let inputValue: string;
    if (e instanceof CustomEvent) {
      inputValue = String(e.detail) || '';
    } else {
      // 標準的な InputEvent の場合は data プロパティまたは target.value を使用
      const target = e.target as HTMLInputElement;
      inputValue = target?.value || '';
    }
    
    this.host.term = inputValue;

    // ユーザーが入力を行ったことを記録
    this.host.hasUserInput = true;

    // 新しい入力があった場合、サジェスト抑制を解除
    if (this.host.suppressSuggestions) {
      this.host.suppressSuggestions = false;
    }

    this.host.dispatchEvent(
      new CustomEvent('input-term', {
        detail: inputValue,
        bubbles: true,
        composed: true,
      })
    );

    // 3文字未満の場合はサジェストを非表示
    if (this.host.term.length < 3) {
      this.host.hideControllerSuggestions();
      this.host.clearControllerSuggestData();
    }
  };

  /** クリックイベントを処理 - サジェスト選択位置を初期化 */
  handleClick = (): void => {
    this.host.resetKeyboardSelection();
  };

  /** フォーカスインイベントを処理 - 条件を満たす場合サジェストを表示 */
  handleFocusIn = (): void => {
    // ユーザーが実際に入力を行った場合のみサジェストを表示
    if (
      this.host.term?.length > 3 &&
      !this.host.suppressSuggestions &&
      this.host.hasUserInput
    ) {
      this.host.showControllerSuggestions();
    }
  };

  /** フォーカスアウトイベントを処理 - サジェストを非表示 */
  handleFocusOut = (): void => {
    this.host.hideSuggestionsMethod();
  };

  /** 入力リセットイベントを処理 - すべてのフィールドをクリア */
  handleInputReset = (): void => {
    this.host.term = '';
    this.host.value = '';
    this.host.label = '';
    this.host.showSuggestions = false;
    this.host.hasUserInput = false;
    this.host.clearControllerSuggestData();
    this.host.hideSuggestionsMethod();
    this.host.dispatchEvent(new CustomEvent('input-reset'));
  };

  /** 入力フィールドの状態をリセット */
  resetInputState(): void {
    this.host.term = '';
    this.host.value = '';
    this.host.label = '';
  }

  /** サジェスト表示の条件をチェック */
  shouldShowSuggestions(): boolean {
    return this.host.term && this.host.term.length >= 3;
  }
}
