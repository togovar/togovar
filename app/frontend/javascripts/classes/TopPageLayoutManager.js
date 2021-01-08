class TopPageLayoutManager { 

  constructor() {
  }

  init() {
    // reference
    this._GlobalHeaderHeight = document.getElementById('GlobalHeader').clientHeight;
    this._SearchInputView = document.getElementById('SearchInputView');
    this._SearchResultsView = document.getElementById('SearchResultsView');
    this._drawerView = document.querySelector('.drawer-view');
    
    this.update();
  }

  update() {
    const drawerHeight = window.innerHeight - this._drawerView.offsetTop;
    this._SearchResultsView.style.height = `calc(100vh - ${this._GlobalHeaderHeight + this._SearchInputView.clientHeight + drawerHeight}px)`
  }

}

export default new TopPageLayoutManager();
