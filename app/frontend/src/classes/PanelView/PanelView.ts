export class PanelView {
  protected panelViewEl: Element;
  protected panelId: string;
  private localStorageKey: string;

  /**
   * @param panelViewEl - Panel element section.panel-view
   * @param panelId - Panel id (dataset, frequency, quality, type, significance, consequence, shift, polyphen, alphamissense)
   */
  // TODO: A type definition for panelId is required. We probably need to refer to the JSON for SimpleSearch.
  // TODO: Review of localStorageKey is required. If the panel location isn't clearly specified, IDs may duplicate.
  constructor(panelViewEl: Element, panelId: string) {
    this.panelViewEl = panelViewEl;
    this.panelId = panelId;
    this.localStorageKey = 'panel_' + panelId;

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
