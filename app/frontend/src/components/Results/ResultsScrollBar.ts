import { storeManager } from '../../store/StoreManager';
import { TR_HEIGHT } from '../../global';
import type { DragEventUI, StoreState } from '../../types';
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
  private readonly _container: HTMLElement;
  private readonly _scrollBarElement: HTMLElement;
  private readonly _positionLabel: HTMLElement;
  private readonly _totalLabel: HTMLElement;

  /**
   * wheelイベントのインクリメンタル計算にpixel単位が必要なため、
   * row単位のoffsetとは別にpixel座標をキャッシュする。
   * フィルタ変更などでoffsetが外部から変更された場合は offset() ハンドラで同期する。
   */
  private _lastScrollPosition: number = 0;

  /**
   * unsubscribeで同一参照が必要なため、束縛済みコールバックをフィールドに保持する。
   */
  private _onOffset = (v: number) => this.offset(v);
  private _onNumberOfRecords = (v: number) => this.numberOfRecords(v);
  private _onRowCount = () => this.rowCount();

  // 描画・入力検知の委譲先
  private readonly _renderer: ScrollBarRenderer;
  private readonly _dragManager: DragManager;

  /**
   * スクロールバーのHTML構造を生成し、描画・入力を担うオブジェクトを初期化してStoreにバインドする。
   */
  constructor(containerElement: HTMLElement) {
    this._container = containerElement;

    ScrollBarRenderer.createScrollBarHTML(this._container);

    const { scrollBar, position, total } = ScrollBarRenderer.initializeElements(
      this._container
    );
    this._scrollBarElement = scrollBar;
    this._positionLabel = position;
    this._totalLabel = total;

    this._renderer = new ScrollBarRenderer(
      this._container,
      this._scrollBarElement,
      this._positionLabel,
      this._totalLabel
    );
    this._dragManager = new DragManager({
      scrollBarElement: this._scrollBarElement,
      container: this._container,
      onDragCallback: this._handleDrag.bind(this),
      onVisualStateChange: this._handleVisualStateChange.bind(this),
    });

    this._bindStoreEvents();
    this._renderer.resetCursorStyle();
    this._dragManager.initializeDragManager();
  }

  /**
   * offset/numberOfRecords/rowCount の変化をトリガーにスクロールバーを更新するため購読登録する。
   */
  private _bindStoreEvents(): void {
    storeManager.subscribe('offset', this._onOffset);
    storeManager.subscribe('numberOfRecords', this._onNumberOfRecords);
    storeManager.subscribe('rowCount', this._onRowCount);
  }

  // ================================================================
  // Storeイベントハンドラ
  // ================================================================

  /**
   * フィルタ変更などでStoreのoffsetが外部から書き換わった際に、スクロールバーの見た目と
   * _lastScrollPosition を同時に同期する。
   * 同期を省くと次のwheelイベントで古い座標から計算が始まり、意図しない位置ジャンプが起きる。
   */
  offset(offset: number): void {
    this._renderer.updatePositionLabel(offset);
    this._synchronizeScrollBarWithStore();
    this._lastScrollPosition = offset * TR_HEIGHT;

    // タッチデバイスでスクロール中は-activeクラスを維持する
    if (
      window.matchMedia('(hover: none) and (pointer: coarse)').matches &&
      this._container.classList.contains('-active')
    ) {
      return;
    }
  }

  /**
   * データ総件数の変化に応じてスクロールバーの総件数ラベルとサイズを更新する。
   * データ取得完了後に件数が確定するため、Storeの変化を契機に再計算する。
   */
  numberOfRecords(numberOfRecords: number): void {
    this._renderer.updateTotalLabel(numberOfRecords);
    this._synchronizeScrollBarWithStore();
  }

  /**
   * 表示行数の変化でスクロールバーのサム高さが変わるため、再計算する。
   * ウィンドウリサイズや列高さ変更で rowCount が変わることがある。
   */
  rowCount(): void {
    this._synchronizeScrollBarWithStore();
  }

  // ================================================================
  // 表示状態管理
  // ================================================================

  /**
   * タッチスクロール終了後に-activeクラスを外し、フィードバック表示を解除する。
   */
  setInactive(): void {
    this._renderer.setInactive();
  }

  /**
   * タッチスクロール開始時に-activeクラスを付けて視覚フィードバックを有効にする。
   */
  setActive(): void {
    this._renderer.setActive();
  }

  // ================================================================
  // ライフサイクル管理
  // ================================================================

  /**
   * Storeバインドとイベントリスナーをまとめて解除してメモリリークを防ぐ。
   * コンポーネント破棄時に必ず呼ぶこと。
   */
  destroy(): void {
    this._dragManager.destroyDragManager();

    storeManager.unsubscribe('offset', this._onOffset);
    storeManager.unsubscribe('numberOfRecords', this._onNumberOfRecords);
    storeManager.unsubscribe('rowCount', this._onRowCount);

    this._renderer.clearAllTimeouts();

    const scrollBarElement = this._container.querySelector('.bar');
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
    const visibleRowCount = this._getStoreData('rowCount', 0);
    const totalRecordCount = this._getStoreData('numberOfRecords', 0);

    if (visibleRowCount <= 0 || totalRecordCount <= 0) {
      return;
    }

    const newOffset = calculateTouchBasedRowOffset(
      deltaY,
      touchStartOffset,
      visibleRowCount,
      totalRecordCount
    );
    const boundedOffset = constrainRowOffsetToValidRange(
      newOffset,
      visibleRowCount,
      totalRecordCount
    );

    this._lastScrollPosition = boundedOffset * TR_HEIGHT;
    storeManager.setData('offset', boundedOffset);
    this.updateDirectly(boundedOffset);
  }

  /**
   * wheelイベントのインクリメンタルスクロール。
   * _lastScrollPosition にデルタを加算してpixel座標を更新し、row offsetに変換してStoreへ書く。
   * 座標が変化しない場合はStoreへの書き込みをスキップして無駄な再描画を防ぐ。
   */
  handleScroll(deltaY: number): void {
    const totalRecordCount = this._getStoreData('numberOfRecords', 0);
    const visibleRowCount = this._getStoreData('rowCount', 0);

    if (visibleRowCount <= 0 || totalRecordCount <= 0) {
      return;
    }

    const calculation = calculateNewScrollPosition(
      deltaY,
      this._lastScrollPosition,
      totalRecordCount,
      visibleRowCount
    );

    if (calculation.newScrollPosition === this._lastScrollPosition) {
      return;
    }

    this._lastScrollPosition = calculation.newScrollPosition;
    const offset = convertScrollPositionToRowOffset(this._lastScrollPosition);
    storeManager.setData('offset', offset);
  }

  /**
   * 外部から offset を指定してスクロールバーの見た目を直接更新する。
   * タッチスクロール後にフィードバックを即時反映するために使う。
   */
  updateDirectly(offset: number): void {
    const visibleRowCount = this._getStoreData('rowCount', 0);
    const totalRecordCount = this._getStoreData('numberOfRecords', 0);

    if (visibleRowCount <= 0 || totalRecordCount <= 0) {
      return;
    }

    const calculation = calculateScrollbarDimensions(
      offset,
      visibleRowCount,
      totalRecordCount
    );
    this._renderer.applyScrollBarStyles(calculation, offset);
  }

  /**
   * 検索モード切替など、外部から明示的に先頭へ戻す必要がある場合に使う。
   * _lastScrollPosition の同期は offset() ハンドラが担うが、
   * Store更新を伴わずに見た目だけ先頭へ戻したい場面のためにここでも行う。
   */
  resetScrollPosition(): void {
    this._lastScrollPosition = 0;
    this.updateDirectly(0);
  }

  // ================================================================
  // データアクセス
  // ================================================================

  /**
   * 負値や非数値がスクロール計算に混入するとサムが消えたりジャンプするため、
   * Storeから取得した数値をデフォルト値付きで安全に返す。
   */
  private _getStoreData(key: keyof StoreState, defaultValue: number): number {
    const value = storeManager.getData(key);
    return typeof value === 'number' && value >= 0 ? value : defaultValue;
  }

  /**
   * スクロール計算で必ず必要になる3値をまとめて取得する。
   * 個別取得の繰り返しを避けてコードの見通しをよくするためにまとめてある。
   */
  private _getScrollData(): {
    visibleRowCount: number;
    totalRecordCount: number;
    offset: number;
  } {
    return {
      visibleRowCount: this._getStoreData('rowCount', 0),
      totalRecordCount: this._getStoreData('numberOfRecords', 0),
      offset: this._getStoreData('offset', 0),
    };
  }

  // ================================================================
  // 描画更新
  // ================================================================

  /**
   * offset/numberOfRecords/rowCount のどれが変わってもスクロールバーの見た目は同じ計算で
   * 更新できるため、共通処理としてまとめてある。
   */
  private _synchronizeScrollBarWithStore(): void {
    const { offset, visibleRowCount, totalRecordCount } = this._getScrollData();

    const calculation = calculateScrollbarDimensions(
      offset,
      visibleRowCount,
      totalRecordCount
    );

    this._renderer.updateScrollBarVisualState(
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
  private _handleDrag(top: number): void {
    this._renderer.updateScrollBarPosition(top);

    const mockEvent: DragEventUI = { position: { top } };
    this._processDragPosition(null, mockEvent);
  }

  /**
   * ドラッグのpixel座標からrow offsetを計算してStoreへ書く。
   * wheelスクロールと一貫した操作感を保つため、_lastScrollPosition も同時に更新する。
   */
  private _processDragPosition(e: Event | null, ui: DragEventUI): void {
    const visibleRowCount = this._getStoreData('rowCount', 0);
    const totalRecordCount = this._getStoreData('numberOfRecords', 0);

    if (visibleRowCount <= 0 || totalRecordCount <= 0) {
      return;
    }

    const availableHeight = visibleRowCount * TR_HEIGHT;
    const offsetRate = ui.position.top / availableHeight;

    let offset = Math.ceil(offsetRate * totalRecordCount);
    offset = constrainRowOffsetToValidRange(
      offset,
      visibleRowCount,
      totalRecordCount
    );

    this._lastScrollPosition = offset * TR_HEIGHT;

    storeManager.setData('offset', offset);
    this._renderer.activateDragStateWithAutoRelease();
  }

  /**
   * ドラッグ中のカーソルスタイルとドラッグ状態クラスを切り替える。
   * DragManagerがドラッグの開始・終了を検知し、このコールバックで見た目を反映する。
   */
  private _handleVisualStateChange(isDragging: boolean): void {
    this._renderer.updateCursorStyle(isDragging);
    this._renderer.updateDraggingState(isDragging);
  }
}
