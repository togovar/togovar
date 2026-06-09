class TopPageLayoutManager {
  // Advanced SearchのConditionで高さが変化するため、ただしresizeで発火は変更が必要になる可能性あり

  constructor() {
    this._isReady = false; // 初期化フラグ
    this._resizeObserver = null;
    this._updateFrameId = null;
  }

  /** SearchInputViewの高さが初期描画後に変わるため、再計算対象と監視を初期化する。
   * @param {Array} targets - 表示サイズを更新するコンポーネントのリスト */
  init(targets) {
    this._isReady = true;
    this.targets = targets;

    // パフォーマンス向上のためにDOM要素をキャッシュ
    this._globalHeader = document.getElementById('GlobalHeader');
    this._searchInputView = document.getElementById('SearchInputView');
    this._searchResultsView = document.getElementById('SearchResultsView');
    this._drawerView = document.querySelector('.drawer-view');

    // 初回レイアウト更新
    this.update();

    // バインドされたハンドラーを保存（クリーンアップ時に使用）
    this._boundUpdateHandler = this.update.bind(this);

    // ウィンドウリサイズ時にレイアウトを更新
    window.addEventListener('resize', this._boundUpdateHandler);
    window.dispatchEvent(new Event('resize')); // 読み込み時にレイアウトを更新

    this._setupResizeObserver();
  }

  /** SearchInputViewはモード切替や遅延描画で高さが変わるため、次フレームに再計算をまとめる */
  scheduleUpdate() {
    if (!this._isReady || this._updateFrameId !== null) return;

    this._updateFrameId = requestAnimationFrame(() => {
      this._updateFrameId = null;
      this.update();
    });
  }

  /** 検索フォームやdrawerの実寸が変わったときに、検索結果エリアの高さを追従させる */
  _setupResizeObserver() {
    if (typeof ResizeObserver === 'undefined') return;

    this._resizeObserver = new ResizeObserver(() => {
      this.scheduleUpdate();
    });

    [this._globalHeader, this._searchInputView, this._drawerView].forEach(
      (elm) => {
        if (elm) this._resizeObserver.observe(elm);
      }
    );
  }

  /** 検索結果エリアやターゲット要素は周辺UIの実寸から残り高さを決める */
  update() {
    if (!this._isReady) return;

    const globalHeaderHeight = this._globalHeader?.clientHeight || 0;
    const searchInputHeight = this._searchInputView?.clientHeight || 0;
    const drawerOffsetTop = this._drawerView?.offsetTop || 0;
    const drawerHeight = window.innerHeight - drawerOffsetTop;
    const searchResultsHeight =
      window.innerHeight -
      (globalHeaderHeight + searchInputHeight + drawerHeight);

    // 検索結果エリアの高さを動的に調整
    if (this._searchResultsView) {
      this._searchResultsView.style.setProperty(
        '--search-results-height',
        `${Math.max(0, searchResultsHeight)}px`
      );
    }

    // すべてのターゲット要素の表示サイズを更新
    this.targets.forEach((target) => target.updateDisplaySize());
  }

  /** ページ離脱時に古い監視や予約済み更新が残らないよう、登録したリソースを解放する。 */
  cleanup() {
    if (this._boundUpdateHandler) {
      window.removeEventListener('resize', this._boundUpdateHandler);
    }

    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }

    if (this._updateFrameId !== null) {
      cancelAnimationFrame(this._updateFrameId);
    }

    // 参照をクリア
    this.targets = null;
    this._globalHeader = null;
    this._searchInputView = null;
    this._searchResultsView = null;
    this._drawerView = null;
    this._resizeObserver = null;
    this._updateFrameId = null;
    this._isReady = false;
  }
}

export default new TopPageLayoutManager();
