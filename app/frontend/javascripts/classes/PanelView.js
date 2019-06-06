import StoreManager from "./StoreManager.js";

export default class PanelView {
  constructor(elm, kind) {
    this.elm = elm;
    this.kind = kind;

    const close = this.elm.querySelector('.close');
    if (close) {
      close.addEventListener('click', () => {
        switch (this.elm.parentNode.id) {
          case 'Previews': {
            const
              previews = StoreManager.getData('previewPanels'),
              preview = previews.find(preview => preview.id === this.elm.id.substr(7));
            preview.isUsed = false;
            StoreManager.setData('previewPanels', previews);
          }
            break;
          case 'Filters': {
            const
              filters = StoreManager.getData('filterPanels'),
              filter = filters.find(filter => filter.id === this.elm.id.substr(6));
            filter.isUsed = false;
            StoreManager.setData('filterPanels', filters);
          }
            break;
        }
      });
    }
  }
}
