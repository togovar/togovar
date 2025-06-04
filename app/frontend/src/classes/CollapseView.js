import TopPageLayoutManager from "./TopPageLayoutManager.js";

export default class CollapseView {

  constructor(collapseView) {
    this.setup(collapseView);
  }

  setup(collapseView) {
    if (collapseView.classList.contains('-terminal')) return;

    // collapse event
    collapseView.querySelector('.collapsebutton').addEventListener('click', _e => {
      collapseView.classList.toggle('-collapsed');
      // unstructured case
      if (collapseView.classList.contains('-unstructured')) {
        this.collapseTargets.forEach(target => {
          const isParentCollapsed = target.ancestors.some(tr => tr.querySelector('.collapse-view').classList.contains('-collapsed'));
          target.TR.style.display = isParentCollapsed ? 'none' : 'table-row';
        });
      }
      // set status in localStorage
      window.localStorage.setItem(collapseId, collapseView.classList.contains('-collapsed') ? 'collapsed' : '');
      // update layout
      if (collapseView.dataset.collapseId === 'advanced-search') {
        TopPageLayoutManager.update();
      }
    });

    // collapse targets
    if (collapseView.classList.contains('-unstructured')) {
      this.collapseTargets = [];
      const ancestors = [];
      const depth = parseInt(collapseView.dataset.collapseDepth);
      let parentNode = collapseView;
      while (parentNode.tagName !== 'TR') {
        parentNode = parentNode.parentNode;
      }
      ancestors[depth] = parentNode;
      let nextTR = parentNode.nextSibling;
      while (nextTR !== null) {
        let isValid = false, targetDepth;
        const target = nextTR.querySelector('.collapse-view[data-collapse-depth]');
        if (target) {
          targetDepth = target.dataset.collapseDepth;
          if (targetDepth) {
            targetDepth = parseInt(targetDepth);
            if (targetDepth > depth) {
              isValid = true;
            }
          }
        }
        if (isValid) {
          ancestors[targetDepth] = nextTR;
          this.collapseTargets.push({
            ancestors: ancestors.slice(depth, targetDepth),
            TR:  nextTR
          });
          nextTR = nextTR.nextSibling;
        } else {
          break;
        }
      }
    }

    // default status
    const collapseId = collapseView.dataset.collapseId;
    if (collapseId && window.localStorage.getItem(collapseId) === 'collapsed') {
      collapseView.querySelector('.collapsebutton').dispatchEvent(new Event('click'));
    }

  }
  
}
