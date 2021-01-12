import TopPageLayoutManager from "./TopPageLayoutManager.js";

export default class CollapseViewManager {

  constructor() {
    //this.elm = elm;
    document.querySelectorAll('.collapse-view').forEach(collapseView => {
      this.setup(collapseView);
    });
  }

  setup(collapseView) {
    // default status
    const collapseId = collapseView.dataset.collapseId;
    if (collapseId && window.localStorage.getItem(collapseId) === 'collapsed') {
      collapseView.classList.add('-collapsed');
    }

    // collapse event
    collapseView.querySelector('.collapsebutton').addEventListener('click', e => {
      collapseView.classList.toggle('-collapsed');
      // set status in localStorage
      window.localStorage.setItem(collapseId, collapseView.classList.contains('-collapsed') ? 'collapsed' : '');
      // update layout
      if (collapseView.dataset.collapseId === 'advanced-search') {
        TopPageLayoutManager.update();
      }
    });
  }
  
}
