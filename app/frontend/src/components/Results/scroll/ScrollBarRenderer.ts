import type { ScrollBarCalculation } from '../../../types';

// ドラッグ状態の自動解除までの待機時間（ms）
const RELEASE_DURATION = 2000;

/**
 * スクロールバーの DOM 操作と描画を担うクラス。
 * 座標計算は scrollCalculator に委譲し、このクラスはスタイル適用とクラス操作のみを行う。
 */
export class ScrollBarRenderer {
  // CSS クラス定数
  private static readonly CLASS_CURSOR_GRAB = 'grab';
  private static readonly CLASS_CURSOR_GRABBING = 'grabbing';
  private static readonly CLASS_ACTIVE = '-active';
  private static readonly CLASS_DRAGGING = '-dragging';
  private static readonly CLASS_DISABLED = '-disabled';
  private static readonly CLASS_BAR = 'bar';
  private static readonly CLASS_POSITION = 'position';
  private static readonly CLASS_TOTAL = 'total';

  private readonly container: HTMLElement;
  private readonly scrollBarElement: HTMLElement;
  private readonly positionLabel: HTMLElement;
  private readonly totalLabel: HTMLElement;

  // 同じ値での DOM 更新を避けるためのキャッシュ
  private lastPositionValue = -1;
  private lastTotalValue = -1;

  private releaseTimeoutId: number | undefined;

  constructor(
    container: HTMLElement,
    scrollBarElement: HTMLElement,
    positionLabel: HTMLElement,
    totalLabel: HTMLElement
  ) {
    this.container = container;
    this.scrollBarElement = scrollBarElement;
    this.positionLabel = positionLabel;
    this.totalLabel = totalLabel;
  }

  // ================================================================
  // DOM 初期化（static）
  // ================================================================

  /** スクロールバーの HTML 構造をコンテナへ挿入する。 */
  static createScrollBarHTML(container: HTMLElement): void {
    container.insertAdjacentHTML(
      'beforeend',
      `<div class="${ScrollBarRenderer.CLASS_BAR}">
        <div class="indicator">
          <span class="${ScrollBarRenderer.CLASS_POSITION}">1</span>
          <span class="${ScrollBarRenderer.CLASS_TOTAL}"></span>
        </div>
      </div>`
    );
  }

  /** コンテナからスクロールバーに必要な DOM 要素を取得して返す。 */
  static initializeElements(container: HTMLElement) {
    const scrollBar = container.querySelector(
      `.${ScrollBarRenderer.CLASS_BAR}`
    )! as HTMLElement;
    const position = scrollBar.querySelector(
      `.${ScrollBarRenderer.CLASS_POSITION}`
    )! as HTMLElement;
    const total = scrollBar.querySelector(
      `.${ScrollBarRenderer.CLASS_TOTAL}`
    )! as HTMLElement;

    return { scrollBar, position, total };
  }

  // ================================================================
  // ラベル更新
  // ================================================================

  /**
   * 現在位置ラベルを更新する。
   * 値が変わっていない場合は DOM を触らずスキップし、不要なレイアウト再計算を防ぐ。
   */
  updatePositionLabel(offset: number): void {
    const value = offset + 1;
    if (value === this.lastPositionValue) return;
    this.lastPositionValue = value;
    this.positionLabel.textContent = String(value);
  }

  /**
   * 総件数ラベルを更新する。
   * 値が変わっていない場合は DOM を触らずスキップし、不要なレイアウト再計算を防ぐ。
   */
  updateTotalLabel(numberOfRecords: number): void {
    if (numberOfRecords === this.lastTotalValue) return;
    this.lastTotalValue = numberOfRecords;
    this.totalLabel.textContent = numberOfRecords.toLocaleString();
  }

  // ================================================================
  // 位置・サイズのスタイル適用
  // ================================================================

  /**
   * タッチスクロール中のリアルタイムフィードバック用にスクロールバーを更新する。
   * active クラスと position ラベルも同時に反映する。
   */
  applyScrollBarStyles(calculation: ScrollBarCalculation, offset: number): void {
    this.scrollBarElement.style.height = `${calculation.barHeight}px`;
    this.scrollBarElement.style.top = `${calculation.barTop}px`;
    this.updatePositionLabel(offset);
    this.container.classList.add(ScrollBarRenderer.CLASS_ACTIVE);
  }

  /**
   * Store の値変化（offset・件数・行数）に応じてスクロールバーを同期する。
   * ドラッグ状態を起動してラベルを表示し、スクロール停止後 RELEASE_DURATION で自動解除する。
   */
  updateScrollBarVisualState(
    calculation: ScrollBarCalculation,
    rowCount: number,
    numberOfRecords: number
  ): void {
    this.scrollBarElement.style.height = `${calculation.barHeight}px`;
    this.scrollBarElement.style.top = `${calculation.barTop}px`;

    this.activateDragStateWithAutoRelease();

    if (rowCount === 0 || numberOfRecords === rowCount) {
      this.scrollBarElement.classList.add(ScrollBarRenderer.CLASS_DISABLED);
    } else {
      this.scrollBarElement.classList.remove(ScrollBarRenderer.CLASS_DISABLED);
    }
  }

  /** スクロールバーの top 位置だけを更新する（ドラッグ中の位置追従用）。 */
  updateScrollBarPosition(top: number): void {
    this.scrollBarElement.style.top = `${top}px`;
  }

  // ================================================================
  // active 状態管理
  // ================================================================

  /** スクロールバーを active 状態にする（タッチスクロール開始時）。 */
  setActive(): void {
    this.container.classList.add(ScrollBarRenderer.CLASS_ACTIVE);
  }

  /** スクロールバーの active 状態を解除する（タッチスクロール終了時）。 */
  setInactive(): void {
    this.container.classList.remove(ScrollBarRenderer.CLASS_ACTIVE);
  }

  // ================================================================
  // ドラッグ状態管理
  // ================================================================

  /**
   * ドラッグの開始・終了に応じてスクロールバーの見た目を切り替える。
   * 終了時は一定時間後に自動解除して視覚フィードバックを残す。
   */
  updateDraggingState(isDragging: boolean): void {
    if (isDragging) {
      this.container.classList.add(ScrollBarRenderer.CLASS_DRAGGING);
      this.container.classList.add(ScrollBarRenderer.CLASS_ACTIVE);
    } else {
      this.activateDragStateWithAutoRelease();
    }
  }

  /**
   * ドラッグ状態を即座に表示し、RELEASE_DURATION 後に自動解除する。
   * 既存タイマーはリセットして多重起動を防ぐ。
   */
  activateDragStateWithAutoRelease(): void {
    if (this.releaseTimeoutId !== undefined) {
      window.clearTimeout(this.releaseTimeoutId);
    }

    this.container.classList.add(ScrollBarRenderer.CLASS_DRAGGING);

    this.releaseTimeoutId = window.setTimeout(() => {
      this.container.classList.remove(ScrollBarRenderer.CLASS_DRAGGING);
      this.releaseTimeoutId = undefined;
    }, RELEASE_DURATION);
  }

  // ================================================================
  // カーソルスタイル
  // ================================================================

  /** ドラッグ中かどうかに応じてカーソルを grabbing / grab に切り替える。 */
  updateCursorStyle(isDragging: boolean): void {
    this.scrollBarElement.style.cursor = isDragging
      ? ScrollBarRenderer.CLASS_CURSOR_GRABBING
      : ScrollBarRenderer.CLASS_CURSOR_GRAB;
  }

  /** カーソルを grab（初期状態）にリセットする。 */
  resetCursorStyle(): void {
    this.scrollBarElement.style.cursor = ScrollBarRenderer.CLASS_CURSOR_GRAB;
  }

  // ================================================================
  // クリーンアップ
  // ================================================================

  /** 実行中のタイマーをすべてキャンセルする。コンポーネント破棄時に必ず呼ぶこと。 */
  clearAllTimeouts(): void {
    if (this.releaseTimeoutId !== undefined) {
      window.clearTimeout(this.releaseTimeoutId);
      this.releaseTimeoutId = undefined;
    }
  }
}
