export default class PanelView {
  constructor(elm, kind) {
    this.elm = elm;
    this.localStorageKey = 'panel_' + kind;
    this.kind = kind;

    if (window.localStorage.getItem(this.localStorageKey) === 'collapsed') {
      elm.classList.add('-collapsed');
    }

    // collapse event
    elm.querySelector('.title').addEventListener('click', () => {
      elm.classList.toggle('-collapsed');
      window.localStorage.setItem(this.localStorageKey, elm.classList.contains('-collapsed') ? 'collapsed' : '');
    })

  }
}
