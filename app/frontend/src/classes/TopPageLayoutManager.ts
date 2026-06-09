interface DisplaySizeTarget {
  updateDisplaySize(): void;
}

class TopPageLayoutManager {
  private targets: DisplaySizeTarget[] = [];
  private _isReady = false;
  private _globalHeader: HTMLElement | null = null;
  private _searchInputView: HTMLElement | null = null;
  private _searchResultsView: HTMLElement | null = null;
  private _drawerView: HTMLElement | null = null;
  private _boundUpdateHandler: (() => void) | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  private _updateFrameId: number | null = null;

  /**
   * SearchInputViewの高さが初期描画後に変わるため、再計算対象と監視を初期化する。
   */
  init(targets: DisplaySizeTarget[]): void {
    this.cleanup();

    this._isReady = true;
    this.targets = targets;
    this._cacheElements();

    this.update();

    this._boundUpdateHandler = this.update.bind(this);
    window.addEventListener('resize', this._boundUpdateHandler);
    window.dispatchEvent(new Event('resize'));

    this._setupResizeObserver();
  }

  /**
   * モード切替や遅延描画で連続する高さ変化を1フレームにまとめる。
   */
  scheduleUpdate(): void {
    if (!this._isReady || this._updateFrameId !== null) return;

    this._updateFrameId = requestAnimationFrame(() => {
      this._updateFrameId = null;
      this.update();
    });
  }

  /**
   * 検索フォームやdrawerの実寸が変わったときに検索結果エリアの高さを追従させる。
   */
  private _setupResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;

    this._resizeObserver = new ResizeObserver(() => {
      this.scheduleUpdate();
    });

    [this._globalHeader, this._searchInputView, this._drawerView].forEach(
      (elm) => {
        if (elm) this._resizeObserver?.observe(elm);
      }
    );
  }

  /**
   * 検索結果エリアやターゲット要素は周辺UIの実寸から残り高さを決める。
   */
  update(): void {
    if (!this._isReady) return;

    const searchResultsHeight = this._calculateSearchResultsHeight();

    this._searchResultsView?.style.setProperty(
      '--search-results-height',
      `${Math.max(0, searchResultsHeight)}px`
    );

    this.targets.forEach((target) => {
      target.updateDisplaySize();
    });
  }

  /**
   * ページ離脱時に古い監視や予約済み更新が残らないよう、登録したリソースを解放する。
   */
  cleanup(): void {
    if (this._boundUpdateHandler) {
      window.removeEventListener('resize', this._boundUpdateHandler);
    }

    this._resizeObserver?.disconnect();

    if (this._updateFrameId !== null) {
      cancelAnimationFrame(this._updateFrameId);
    }

    this.targets = [];
    this._globalHeader = null;
    this._searchInputView = null;
    this._searchResultsView = null;
    this._drawerView = null;
    this._boundUpdateHandler = null;
    this._resizeObserver = null;
    this._updateFrameId = null;
    this._isReady = false;
  }

  /**
   * DOM参照はレイアウト更新で繰り返し使うため、初期化時にまとめて取得する。
   */
  private _cacheElements(): void {
    this._globalHeader = document.getElementById('GlobalHeader');
    this._searchInputView = document.getElementById('SearchInputView');
    this._searchResultsView = document.getElementById('SearchResultsView');
    this._drawerView = document.querySelector<HTMLElement>('.drawer-view');
  }

  /**
   * drawerはfixed配置なので、offsetTopから見えている高さを算出して残り領域を求める。
   */
  private _calculateSearchResultsHeight(): number {
    const drawerOffsetTop = this._drawerView?.offsetTop ?? window.innerHeight;
    const drawerHeight = window.innerHeight - drawerOffsetTop;

    return (
      window.innerHeight -
      (this._getElementHeight(this._globalHeader) +
        this._getElementHeight(this._searchInputView) +
        drawerHeight)
    );
  }

  /**
   * 要素が未生成の初期状態でもレイアウト計算を継続できるよう、未取得時は0として扱う。
   */
  private _getElementHeight(elm: HTMLElement | null): number {
    return elm?.clientHeight ?? 0;
  }
}

export default new TopPageLayoutManager();
