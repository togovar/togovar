class PanelView {
  protected elm: Element;
  protected kind: string;
  private localStorageKey: string;

  /**
   * @param elm - Panel element section.panel-view
   * @param kind - Panel id (dataset, frequency, quality, type, significance, consequence, shift, polyphen, alphamissense)
   */
  constructor(elm: Element, kind: string) {
    this.elm = elm;
    this.kind = kind;
    this.localStorageKey = 'panel_' + kind;

    // Use local storage and manage panel opening/closing
    if (window.localStorage.getItem(this.localStorageKey) === 'collapsed') {
      elm.classList.add('-collapsed');
    }
    // collapse event
    const titleElement = elm.querySelector('.title');
    if (titleElement) {
      titleElement.addEventListener('click', () => {
        elm.classList.toggle('-collapsed');
        window.localStorage.setItem(
          this.localStorageKey,
          elm.classList.contains('-collapsed') ? 'collapsed' : ''
        );
      });
    }
  }
}

export default PanelView;
