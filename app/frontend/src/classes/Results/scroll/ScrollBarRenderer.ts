import { ScrollBarCalculation } from '../../../types';

const RELEASE_DURATION = 2000;

/**
 * スクロールバーのDOM操作とレンダリングを担当するクラス
 */
export class ScrollBarRenderer {
  private _releaseTimeoutId: number | undefined;

  // プライベートプロパティ（直接アクセス用）
  private readonly _container: HTMLElement;
  private readonly _scrollBarElement: HTMLElement;
  private readonly _positionDisplay: HTMLElement;
  private readonly _totalDisplay: HTMLElement;

  constructor(
    container: HTMLElement,
    scrollBarElement: HTMLElement,
    positionDisplay: HTMLElement,
    totalDisplay: HTMLElement
  ) {
    this._container = container;
    this._scrollBarElement = scrollBarElement;
    this._positionDisplay = positionDisplay;
    this._totalDisplay = totalDisplay;
  }

  /**
   * Get container element
   */
  getContainer(): HTMLElement {
    return this._container;
  }

  /**
   * Get scrollbar element
   */
  getScrollBarElement(): HTMLElement {
    return this._scrollBarElement;
  }

  /**
   * Get position display element
   */
  getPositionDisplay(): HTMLElement {
    return this._positionDisplay;
  }

  /**
   * Get total display element
   */
  getTotalDisplay(): HTMLElement {
    return this._totalDisplay;
  }

  /**
   * HTML構造を作成
   * @param container - コンテナ要素
   */
  static createScrollBarHTML(container: HTMLElement): void {
    container.insertAdjacentHTML(
      'beforeend',
      `
      <div class="bar">
        <div class="indicator">
          <span class="position">1</span>
          <span class="total"></span>
        </div>
      </div>
      `
    );
  }

  /**
   * 必要なDOM要素を取得・検証
   * @param container - コンテナ要素
   */
  static getRequiredElements(container: HTMLElement) {
    const scrollBar = container.querySelector('.bar') as HTMLElement;
    if (!scrollBar) {
      throw new Error('ScrollBar element (.bar) not found');
    }

    const position = scrollBar.querySelector('.position') as HTMLElement;
    const total = scrollBar.querySelector('.total') as HTMLElement;
    if (!position || !total) {
      throw new Error(
        'Required indicator elements (.position, .total) not found'
      );
    }

    return { scrollBar, position, total };
  }

  /**
   * スクロールバーのスタイルを適用
   * @param calculation - 計算結果
   * @param offset - オフセット値
   */
  applyScrollBarStyles(
    calculation: ScrollBarCalculation,
    offset: number
  ): void {
    // バーのスタイル
    this._scrollBarElement.style.height = `${calculation.barHeight}px`;
    this._scrollBarElement.style.top = `${calculation.barTop}px`;

    // 位置表示を更新
    this.updatePositionDisplay(offset);

    // アクティブ状態を維持
    this._container.classList.add('-active');
  }

  /**
   * 位置表示を更新
   * @param offset - オフセット値
   */
  updatePositionDisplay(offset: number): void {
    this._positionDisplay.textContent = String(offset + 1);
  }

  /**
   * 総数表示を更新
   * @param numberOfRecords - 総レコード数
   */
  updateTotalDisplay(numberOfRecords: number): void {
    this._totalDisplay.textContent = numberOfRecords.toLocaleString();
  }

  /**
   * スクロールバーの外観を更新
   * @param calculation - 計算結果
   * @param rowCount - 表示行数
   * @param numberOfRecords - 総レコード数
   */
  updateScrollBarAppearance(
    calculation: ScrollBarCalculation,
    rowCount: number,
    numberOfRecords: number
  ): void {
    this._scrollBarElement.style.height = `${calculation.barHeight}px`;
    this._scrollBarElement.style.top = `${calculation.barTop}px`;
    this.scheduleVisualStateRelease();

    if (rowCount === 0 || numberOfRecords === rowCount) {
      this._scrollBarElement.classList.add('-disabled');
    } else {
      this._scrollBarElement.classList.remove('-disabled');
    }
  }

  /**
   * スクロールバーの位置を設定
   * @param top - 上端位置
   */
  setScrollBarPosition(top: number): void {
    this._scrollBarElement.style.top = `${top}px`;
  }

  /**
   * 視覚的な状態の遅延解除をスケジュール
   */
  scheduleVisualStateRelease(): void {
    if (this._releaseTimeoutId !== undefined) {
      window.clearTimeout(this._releaseTimeoutId);
    }
    this._releaseTimeoutId = window.setTimeout(
      this._releaseVisualState.bind(this),
      RELEASE_DURATION
    );
    this._container.classList.add('-dragging');
  }

  /**
   * ドラッグの視覚的状態を解除
   */
  private _releaseVisualState(): void {
    this._container.classList.remove('-dragging');
  }

  /**
   * スクロールバーをアクティブ化
   */
  activate(): void {
    this._container.classList.add('-active');
  }

  /**
   * スクロールバーを非アクティブ化
   */
  deactivate(): void {
    this._container.classList.remove('-active');
  }

  /**
   * ドラッグ状態を設定
   * @param isDragging - ドラッグ中かどうか
   */
  setDraggingState(isDragging: boolean): void {
    if (isDragging) {
      this._container.classList.add('-dragging');
      this._container.classList.add('-active');
    } else {
      this.scheduleVisualStateRelease();
    }
  }

  /**
   * カーソルスタイルを設定
   * @param isDragging - ドラッグ中かどうか
   */
  setCursorStyle(isDragging: boolean): void {
    this._scrollBarElement.style.cursor = isDragging ? 'grabbing' : 'grab';
  }
}
