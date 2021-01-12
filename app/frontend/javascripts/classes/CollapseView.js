import TopPageLayoutManager from "./TopPageLayoutManager.js";

export default class CollapseView {

  constructor(elm) {
    this.setup(elm);
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
