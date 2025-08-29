import { SearchFieldHost } from '../SearchFieldWithSuggestions';

/** SuggestionKeyboardHandler - キーボードナビゲーションとキー操作を担当するクラス */
export class SuggestionKeyboardHandler {
  private host: SearchFieldHost;

  /** @param host - ホストとなるLitElementインスタンス */
  constructor(host: SearchFieldHost) {
    this.host = host;
  }

  /** キーボードイベント（ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Enter, Escape）を処理 */
  handleUpDownKeys = (e: KeyboardEvent): void => {
    const arrowKeys: string[] = [
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
    ];
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

  /** 左矢印キーの処理 - 列の左移動 */
  private _handleArrowLeft(): void {
    if (this.host.currentSuggestionColumnIndex - 1 < 0) {
      this.host.currentSuggestionColumnIndex =
        this.host._suggestionKeysArray?.length - 1;
      return;
    }
    this.host.currentSuggestionColumnIndex--;
    this._handleStepThroughColumns();
  }

  /** 右矢印キーの処理 - 列の右移動 */
  private _handleArrowRight(): void {
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

  /** 上矢印キーの処理 - 行の上移動 */
  private _handleArrowUp(): void {
    if (this.host.currentSuggestionIndex - 1 < 0) {
      this.host.currentSuggestionIndex =
        this.host.suggestData[
          this.host._suggestionKeysArray[this.host.currentSuggestionColumnIndex]
        ]?.length - 1;
      return;
    }
    this.host.currentSuggestionIndex--;
  }

  /** 下矢印キーの処理 - 行の下移動 */
  private _handleArrowDown(): void {
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

  /** Enterキーの処理 - 選択または検索実行 */
  private _handleEnter(): void {
    if (this.host.showSuggestions && this.host.currentSuggestionIndex !== -1) {
      // サジェストが選択されている場合：ホストに委譲
      this.host.selectCurrentSuggestion();
    } else {
      // サジェストが選択されていない場合：ホストに委譲
      this.host.executeSearchWithoutSuggestion();
    }
  }

  /** Escapeキーの処理 - サジェスト非表示 */
  private _handleEscape(): void {
    this.host.closeSuggestions();
  }

  /** 列間のインデックス調整を処理 */
  private _handleStepThroughColumns(): void {
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

  /** 選択位置を初期化 */
  resetSelection(): void {
    this.host.currentSuggestionIndex = -1;
    this.host.currentSuggestionColumnIndex = 0;
  }
}
