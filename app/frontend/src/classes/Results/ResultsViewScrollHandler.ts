import { storeManager } from '../../store/StoreManager';
import { TR_HEIGHT } from '../../global.js';

/**
 * スクロール処理を管理するクラス
 * スクロールバーの制御、スクロール量の計算、表示位置の管理を行う
 */
export class ResultsViewScrollHandler {
  /** ルート要素 */
  private elm: HTMLElement;
  /** 最後のスクロール位置 */
  private lastScroll: number = 0;

  /**
   * コンストラクタ
   * @param elm - ルート要素
   */
  constructor(elm: HTMLElement) {
    this.elm = elm;
  }

  /**
   * 最後のスクロール位置を取得
   * @returns 最後のスクロール位置
   */
  get lastScrollPosition(): number {
    return this.lastScroll;
  }

  /**
   * 最後のスクロール位置を設定
   * @param scroll - スクロール位置
   */
  set lastScrollPosition(scroll: number) {
    this.lastScroll = scroll;
  }

  /**
   * offsetからthis.lastScrollを更新する
   */
  updateLastScrollFromOffset(): void {
    const currentOffset = storeManager.getData('offset') || 0;
    this.lastScroll = currentOffset * TR_HEIGHT;
  }

  /**
   * スクロールバーのアクティブ状態を解除する
   */
  deactivateScrollBar(): void {
    const scrollBar = this.elm.querySelector('.scroll-bar') as HTMLElement;
    if (scrollBar) {
      scrollBar.classList.remove('-active');
    }
  }

  /**
   * スクロール処理を行う
   * @param deltaY - Y方向のスクロール量
   */
  handleScroll(deltaY: number): void {
    const totalHeight = storeManager.getData('numberOfRecords') * TR_HEIGHT;
    let availableScrollY =
        totalHeight - storeManager.getData('rowCount') * TR_HEIGHT,
      wheelScroll: number;
    availableScrollY = availableScrollY < 0 ? 0 : availableScrollY;

    // スクロール量の計算
    wheelScroll = this.lastScroll + deltaY;
    wheelScroll = wheelScroll < 0 ? 0 : wheelScroll;
    wheelScroll =
      wheelScroll > availableScrollY ? availableScrollY : wheelScroll;

    if (wheelScroll === this.lastScroll) return;

    // スクロール量決定
    this.lastScroll = wheelScroll;

    // 表示行位置
    let offset = Math.ceil(this.lastScroll / TR_HEIGHT);
    storeManager.setData('offset', offset);
  }

  /**
   * スクロールバーを直接操作している感覚のスクロール処理
   * @param deltaY - Y方向のスクロール量
   * @param touchStartOffset - タッチ開始時のオフセット
   */
  handleScrollWithScrollBarFeedback(
    deltaY: number,
    touchStartOffset: number
  ): void {
    const rowCount = storeManager.getData('rowCount');
    const numberOfRecords = storeManager.getData('numberOfRecords');

    // スクロールバーのドラッグ処理と同じように開始位置からの累積移動量を使用
    const availableHeight = rowCount * TR_HEIGHT;
    const offsetRate = deltaY / availableHeight;
    let newOffset = Math.ceil(offsetRate * numberOfRecords) + touchStartOffset;

    // 境界チェック
    newOffset = newOffset < 0 ? 0 : newOffset;
    newOffset =
      newOffset + rowCount > numberOfRecords
        ? numberOfRecords - rowCount
        : newOffset;

    // lastScrollを更新
    this.lastScroll = newOffset * TR_HEIGHT;

    // スクロールバーを直接操作している感覚でoffsetを更新
    this.updateScrollBarDirectly(newOffset);

    // データ更新（遅延読み込み機能を維持）
    storeManager.setData('offset', newOffset);
  }

  /**
   * スクロールバーの位置を初期化する
   */
  initializeScrollBarPosition(): void {
    const scrollBar = this.elm.querySelector('.scroll-bar') as HTMLElement;
    if (scrollBar) {
      scrollBar.classList.add('-active');
    }
  }

  /**
   * スクロールバーを直接操作している感覚で更新する
   * @param offset - オフセット値
   */
  updateScrollBarDirectly(offset: number): void {
    const scrollBar = this.elm.querySelector('.scroll-bar') as HTMLElement;
    if (!scrollBar) return;

    const rowCount = storeManager.getData('rowCount');
    const numberOfRecords = storeManager.getData('numberOfRecords');
    const totalHeight = numberOfRecords * TR_HEIGHT;
    const displayHeight = rowCount * TR_HEIGHT;
    const displayRate = displayHeight / totalHeight;

    // スクロールバーの高さと位置を計算
    let barHeight = Math.ceil(displayHeight * displayRate);
    barHeight = barHeight < 30 ? 30 : barHeight; // MIN_HEIGHT

    const availableHeight = displayHeight - barHeight;
    const availableRate = availableHeight / totalHeight;
    const barTop = Math.ceil(offset * TR_HEIGHT * availableRate);

    // スクロールバーの位置を直接更新
    const bar = scrollBar.querySelector('.bar') as HTMLElement;
    if (bar) {
      bar.style.height = `${barHeight}px`;
      bar.style.top = `${barTop}px`;

      // 位置表示も更新
      const position = bar.querySelector('.position') as HTMLElement;
      if (position) {
        position.textContent = String(offset + 1);
      }
    }

    // アクティブ状態を維持
    scrollBar.classList.add('-active');
  }
}
