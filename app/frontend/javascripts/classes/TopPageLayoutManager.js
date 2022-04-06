class TopPageLayoutManager {

  constructor() {
  }

  init(targets) {
    this._isReady = true;
    this.targets = targets;
    // reference
    this._GlobalHeaderHeight = document.getElementById('GlobalHeader').clientHeight;
    this._SearchInputView = document.getElementById('SearchInputView');
    this._SearchResultsView = document.getElementById('SearchResultsView');
    this._drawerView = document.querySelector('.drawer-view');
    
    this.update();
    // リサイズされたらスクロール領域の更新
    window.addEventListener('resize', this.update.bind(this));
    window.dispatchEvent(new Event('resize'));
  }

  update() {
    if (!this._isReady) return;
    const drawerHeight = window.innerHeight - this._drawerView.offsetTop;
    this._SearchResultsView.style.height = `calc(100vh - ${this._GlobalHeaderHeight + this._SearchInputView.clientHeight + drawerHeight}px)`;
    this.targets.forEach(target => target.updateDisplaySize() );
  }

}

export default new TopPageLayoutManager();
