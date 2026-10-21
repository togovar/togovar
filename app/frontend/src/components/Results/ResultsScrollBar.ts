import { storeManager } from '../../store/StoreManager';
import { TR_HEIGHT } from '../../global';
import type { DragEventUI } from '../../types';
import {
  calculateNewScrollPosition,
  constrainRowOffsetToValidRange,
  calculateTouchBasedRowOffset,
  convertScrollPositionToRowOffset,
  calculateScrollbarDimensions,
  ScrollBarRenderer,
  DragManager,
} from './scroll';

/**
 * 仮想スクロール（行を固定してoffsetを変える方式）に特化したスクロールバー。
 * マウスホイール・タッチ・ドラッグの3入力を統合し、pixel座標とrow offset を相互変換して
 * Storeに書き込む。ScrollBarRenderer・DragManagerに描画と入力検知を委譲し、
 * このクラスは座標計算とStore連携だけを担う。
 */
export class ResultsScrollBar {
  // コアDOM要素
  private readonly container: HTMLElement;
  private readonly scrollBarElement: HTMLElement;
  private readonly positionLabel: HTMLElement;
  private readonly totalLabel: HTMLElement;

  /**
   * wheelイベントのインクリメンタル計算にpixel単位が必要なため、
   * row単位のoffsetとは別にpixel座標をキャッシュする。
   * フィルタ変更などでoffsetが外部から変更された場合は offset() ハンドラで同期する。
   */
  private lastScrollPosition: number = 0;

  /**
   * unsubscribeで同一参照が必要なため、束縛済みコールバックをフィールドに保持する。
   */
  private onOffset = (v: number) => this.offset(v);
  private onNumberOfRecords = (v: number) => this.numberOfRecords(v);
  private onRowCount = () => this.rowCount();

  // 描画・入力検知の委譲先
  private readonly renderer: ScrollBarRenderer;
  private readonly dragManager: DragManager;

  /**
   * スクロールバーのHTML構造を生成し、描画・入力を担うオブジェクトを初期化してStoreにバインドする。
   */
  constructor(containerElement: HTMLElement) {
    this.container = containerElement;

    ScrollBarRenderer.createScrollBarHTML(this.container);

    const { scrollBar, position, total } = ScrollBarRenderer.initializeElements(
      this.container
    );
    this.scrollBarElement = scrollBar;
    this.positionLabel = position;
    this.totalLabel = total;

    this.renderer = new ScrollBarRenderer(
      this.container,
      this.scrollBarElement,
      this.positionLabel,
      this.totalLabel
    );
    this.dragManager = new DragManager({
      scrollBarElement: this.scrollBarElement,
      container: this.container,
      onDragCallback: this.handleDrag.bind(this),
      onVisualStateChange: this.handleVisualStateChange.bind(this),
    });

    this.bindStoreEvents();
    this.renderer.resetCursorStyle();
    this.dragManager.initializeDragManager();
  }

  /**
   * offset/numberOfRecords/rowCount の変化をトリガーにスクロールバーを更新するため購読登録する。
   */
  private bindStoreEvents(): void {
    storeManager.subscribe('offset', this.onOffset);
    storeManager.subscribe('numberOfRecords', this.onNumberOfRecords);
    storeManager.subscribe('rowCount', this.onRowCount);
  }

  // ================================================================
  // Storeイベントハンドラ
  // ================================================================

  /**
   * フィルタ変更などでStoreのoffsetが外部から書き換わった際に、スクロールバーの見た目と
   * lastScrollPosition を同時に同期する。
   * 同期を省くと次のwheelイベントで古い座標から計算が始まり、意図しない位置ジャンプが起きる。
   */
  offset(offset: number): void {
    const visibleRowCount = this.getStoreData('rowCount', 0);
    const totalRecordCount = this.getStoreData('numberOfRecords', 0);
    this.renderer.updatePositionLabel(offset, visibleRowCount, totalRecordCount);
    this.synchronizeScrollBarWithStore();
    this.lastScrollPosition = offset * TR_HEIGHT;

    // タッチデバイスでスクロール中は-activeクラスを維持する
    if (
      window.matchMedia('(hover: none) and (pointer: coarse)').matches &&
      this.container.classList.contains('-active')
    ) {
      return;
    }
  }

  /**
   * データ総件数の変化に応じてスクロールバーの総件数ラベルとサイズを更新する。
   * データ取得完了後に件数が確定するため、Storeの変化を契機に再計算する。
   */
  numberOfRecords(numberOfRecords: number): void {
    this.renderer.updateTotalLabel(numberOfRecords);
    this.synchronizeScrollBarWithStore();
  }

  /**
   * 表示行数の変化でスクロールバーのサム高さが変わるため、再計算する。
   * ウィンドウリサイズや列高さ変更で rowCount が変わることがある。
   */
  rowCount(): void {
    this.synchronizeScrollBarWithStore();
  }

  // ================================================================
  // 表示状態管理
  // ================================================================

  /**
   * タッチスクロール終了後に-activeクラスを外し、フィードバック表示を解除する。
   */
  setInactive(): void {
    this.renderer.setInactive();
  }

  /**
   * タッチスクロール開始時に-activeクラスを付けて視覚フィードバックを有効にする。
   */
  setActive(): void {
    this.renderer.setActive();
  }

  // ================================================================
  // ライフサイクル管理
  // ================================================================

  /**
   * Storeバインドとイベントリスナーをまとめて解除してメモリリークを防ぐ。
   * コンポーネント破棄時に必ず呼ぶこと。
   */
  destroy(): void {
    this.dragManager.destroyDragManager();

    storeManager.unsubscribe('offset', this.onOffset);
    storeManager.unsubscribe('numberOfRecords', this.onNumberOfRecords);
    storeManager.unsubscribe('rowCount', this.onRowCount);

    this.renderer.clearAllTimeouts();

    const scrollBarElement = this.container.querySelector('.bar');
    if (scrollBarElement) {
      scrollBarElement.remove();
    }
  }

  // ================================================================
  // スクロール処理
  // ================================================================

  /**
   * タッチ操作は慣性や指の絶対位置が基準になるため、wheelと異なり
   * touchStartOffset を起点とした絶対計算を用いる。
   */
  handleScrollWithFeedback(deltaY: number, touchStartOffset: number): void {
    const visibleRowCount = this.getStoreData('rowCount', 0);
    const totalRecordCount = this.getStoreData('numberOfRecords', 0);

    if (visibleRowCount <= 0 || totalRecordCount <= 0) {
      return;
    }

    const newOffset = calculateTouchBasedRowOffset(deltaY, touchStartOffset);
    const boundedOffset = constrainRowOffsetToValidRange(
      newOffset,
      visibleRowCount,
      totalRecordCount
    );

    this.lastScrollPosition = boundedOffset * TR_HEIGHT;
    storeManager.setData('offset', boundedOffset);
    this.updateDirectly(boundedOffset);
  }

  /**
   * wheelイベントのインクリメンタルスクロール。
   * lastScrollPosition にデルタを加算してpixel座標を更新し、row offsetに変換してStoreへ書く。
   * 座標が変化しない場合はStoreへの書き込みをスキップして無駄な再描画を防ぐ。
   */
  handleScroll(deltaY: number): void {
    const totalRecordCount = this.getStoreData('numberOfRecords', 0);
    const visibleRowCount = this.getStoreData('rowCount', 0);

    if (visibleRowCount <= 0 || totalRecordCount <= 0) {
      return;
    }

    const calculation = calculateNewScrollPosition(
      deltaY,
      this.lastScrollPosition,
      totalRecordCount,
      visibleRowCount
    );

    if (calculation.newScrollPosition === this.lastScrollPosition) {
      return;
    }

    this.lastScrollPosition = calculation.newScrollPosition;
    const offset = convertScrollPositionToRowOffset(this.lastScrollPosition);
    storeManager.setData('offset', offset);
  }

  /**
   * 外部から offset を指定してスクロールバーの見た目を直接更新する。
   * タッチスクロール後にフィードバックを即時反映するために使う。
   */
  updateDirectly(offset: number): void {
    const visibleRowCount = this.getStoreData('rowCount', 0);
    const totalRecordCount = this.getStoreData('numberOfRecords', 0);

    if (visibleRowCount <= 0 || totalRecordCount <= 0) {
      return;
    }

    const calculation = calculateScrollbarDimensions(
      offset,
      visibleRowCount,
      totalRecordCount,
      this.container.offsetHeight
    );
    this.renderer.applyScrollBarStyles(calculation, offset, visibleRowCount, totalRecordCount);
  }

  /**
   * 検索モード切替など、外部から明示的に先頭へ戻す必要がある場合に使う。
   * lastScrollPosition の同期は offset() ハンドラが担うが、
   * Store更新を伴わずに見た目だけ先頭へ戻したい場面のためにここでも行う。
   */
  resetScrollPosition(): void {
    this.lastScrollPosition = 0;
    this.updateDirectly(0);
  }

  // ================================================================
  // データアクセス
  // ================================================================

  /**
   * 負値や非数値がスクロール計算に混入するとサムが消えたりジャンプするため、
   * Storeから取得した数値をデフォルト値付きで安全に返す。
   */
  private getStoreData(
    key: 'rowCount' | 'numberOfRecords' | 'offset',
    defaultValue: number
  ): number {
    const value = storeManager.getData(key);
    return typeof value === 'number' && value >= 0 ? value : defaultValue;
  }

  /**
   * スクロール計算で必ず必要になる3値をまとめて取得する。
   * 個別取得の繰り返しを避けてコードの見通しをよくするためにまとめてある。
   */
  private getScrollData(): {
    visibleRowCount: number;
    totalRecordCount: number;
    offset: number;
  } {
    return {
      visibleRowCount: this.getStoreData('rowCount', 0),
      totalRecordCount: this.getStoreData('numberOfRecords', 0),
      offset: this.getStoreData('offset', 0),
    };
  }

  // ================================================================
  // 描画更新
  // ================================================================

  /**
   * offset/numberOfRecords/rowCount のどれが変わってもスクロールバーの見た目は同じ計算で
   * 更新できるため、共通処理としてまとめてある。
   */
  private synchronizeScrollBarWithStore(): void {
    const { offset, visibleRowCount, totalRecordCount } = this.getScrollData();

    const calculation = calculateScrollbarDimensions(
      offset,
      visibleRowCount,
      totalRecordCount,
      this.container.offsetHeight
    );

    this.renderer.updateScrollBarVisualState(
      calculation,
      visibleRowCount,
      totalRecordCount
    );
  }

  // ================================================================
  // ドラッグイベントハンドラ
  // ================================================================

  /**
   * DragManagerからpixel座標を受け取り、描画更新とoffset計算を行う。
   * DragManagerはDOM操作と入力検知を担い、座標の意味解釈はここで行う。
   */
  private handleDrag(top: number): void {
    this.renderer.updateScrollBarPosition(top);

    const mockEvent: DragEventUI = { position: { top } };
    this.processDragPosition(null, mockEvent);
  }

  /**
   * ドラッグのpixel座標からrow offsetを計算してStoreへ書く。
   * wheelスクロールと一貫した操作感を保つため、lastScrollPosition も同時に更新する。
   */
  private processDragPosition(e: Event | null, ui: DragEventUI): void {
    const visibleRowCount = this.getStoreData('rowCount', 0);
    const totalRecordCount = this.getStoreData('numberOfRecords', 0);

    if (visibleRowCount <= 0 || totalRecordCount <= 0) {
      return;
    }

    // calculateScrollbarDimensions の逆変換: barTop = offset/maxOffset * availableScrollSpace
    // → offset = top / availableScrollSpace * maxOffset
    // container.offsetHeight を使うことで DragManager の constrainPositionWithinBounds と一致する
    const scrollbarHeight = this.scrollBarElement.offsetHeight;
    const availableScrollSpace = Math.max(1, this.container.offsetHeight - scrollbarHeight);
    const maxOffset = Math.max(0, totalRecordCount - visibleRowCount);

    let offset = Math.round((ui.position.top / availableScrollSpace) * maxOffset);
    offset = constrainRowOffsetToValidRange(
      offset,
      visibleRowCount,
      totalRecordCount
    );

    this.lastScrollPosition = offset * TR_HEIGHT;

    storeManager.setData('offset', offset);
    this.renderer.activateDragStateWithAutoRelease();
  }

  /**
   * ドラッグ中のカーソルスタイルとドラッグ状態クラスを切り替える。
   * DragManagerがドラッグの開始・終了を検知し、このコールバックで見た目を反映する。
   */
  private handleVisualStateChange(isDragging: boolean): void {
    this.renderer.updateCursorStyle(isDragging);
    this.renderer.updateDraggingState(isDragging);
  }
}
