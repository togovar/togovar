class TopPageLayoutManager {
  // Advanced SearchのConditionで高さが変化するため、ただしresizeで発火は変更が必要になる可能性あり

  constructor() {
    this._isReady = false; // 初期化フラグ
  }

  /** レイアウトマネージャーを初期化する
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
  }

  /** 検索結果エリアやターゲット要素の表示サイズを動的に更新する */
  update() {
    if (!this._isReady) return;

    const globalHeaderHeight = this._globalHeader?.clientHeight || 0;
    const searchInputHeight = this._searchInputView?.clientHeight || 0;
    const drawerOffsetTop = this._drawerView?.offsetTop || 0;
    const drawerHeight = window.innerHeight - drawerOffsetTop;

    // 検索結果エリアの高さを動的に調整
    if (this._searchResultsView) {
      this._searchResultsView.style.height = `calc(100vh - ${
        globalHeaderHeight + searchInputHeight + drawerHeight
      }px)`;
    }

    // すべてのターゲット要素の表示サイズを更新
    this.targets.forEach((target) => target.updateDisplaySize());
  }

  /** リソースのクリーンアップ */
  cleanup() {
    if (this._boundUpdateHandler) {
      window.removeEventListener('resize', this._boundUpdateHandler);
    }

    // 参照をクリア
    this.targets = null;
    this._globalHeader = null;
    this._searchInputView = null;
    this._searchResultsView = null;
    this._drawerView = null;
    this._isReady = false;
  }
}

export default new TopPageLayoutManager();
