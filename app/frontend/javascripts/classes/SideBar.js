import StoreManager from "./StoreManager.js";

export default class SideBar {

  constructor(elm) {
    this.elm = elm;
    this.previews = this.elm.querySelector('#Previews');
    this.filters = this.elm.querySelector('#Filters');

    StoreManager.bind('selectedRow', this);
    StoreManager.bind('previewPanels', this);
    StoreManager.bind('filterPanels', this);

    const scrollBarWidth = this.elm.offsetWidth - this.elm.clientWidth;
    this.elm.style.width = `${this.elm.offsetWidth + scrollBarWidth}px`;
    this.elm.style.marginRight = `-${scrollBarWidth}px`;

    this.stylesheet = document.createElement('style');
    this.stylesheet.type = 'text/css';
    document.getElementsByTagName('head')[0].appendChild(this.stylesheet);
    this.previewPanels(StoreManager.getData('previewPanels'));
  }

  selectedRow(index) {
    if (index === undefined) {
      // show filter
      this.elm.classList.remove('-rowselected');
    } else {
      // show preview
      this.elm.classList.add('-rowselected');
    }
  }

  previewPanels() {
    this.updateStylesheet();
  }

  filterPanels() {
    this.updateStylesheet();
  }

  updateStylesheet() {
    while (this.stylesheet.sheet.cssRules.length > 0) {
      this.stylesheet.sheet.deleteRule(0);
    }

    const CONTENS = [
      {
        stored: StoreManager.getData('previewPanels'),
        prefix: 'Preview'
      },
      {
        stored: StoreManager.getData('filterPanels'),
        prefix: 'Filter'
      }
    ];
    for (const content of CONTENS) {
      for (let i = 0; i < content.stored.length; i++) {
        const panel = content.stored[i];
        this.stylesheet.sheet.insertRule(`
        #${content.prefix}${panel.id} {
          display: ${panel.isUsed ? 'block' : 'none'}
        }`, i);
      }
    }
  }
}
