export class PanelView {
  protected panelViewEl: Element;
  protected kind: string;
  private localStorageKey: string;

  /**
   * @param panelViewEl - Panel element section.panel-view
   * @param kind - Panel id (dataset, frequency, quality, type, significance, consequence, shift, polyphen, alphamissense)
   */
  constructor(panelViewEl: Element, kind: string) {
    this.panelViewEl = panelViewEl;
    this.kind = kind;
    this.localStorageKey = 'panel_' + kind;

    // Use local storage and manage panel opening/closing
    if (window.localStorage.getItem(this.localStorageKey) === 'collapsed') {
      panelViewEl.classList.add('-collapsed');
    }
    // collapse event
    const titleElement = panelViewEl.querySelector('.title');
    if (titleElement) {
      titleElement.addEventListener('click', () => {
        panelViewEl.classList.toggle('-collapsed');
        window.localStorage.setItem(
          this.localStorageKey,
          panelViewEl.classList.contains('-collapsed') ? 'collapsed' : ''
        );
      });
    }
  }
}
