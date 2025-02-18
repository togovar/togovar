import PanelView from './PanelView.js';
import { storeManager } from '../store/StoreManager';

export default class PreviewToVariantReport extends PanelView {
  constructor(elm) {
    super(elm, 'dataset');
    storeManager.bind('selectedRow', this);
    storeManager.bind('offset', this);
    this.title = this.elm.querySelector('.title');
  }

  selectedRow() {
    this.update();
  }

  offset() {
    this.update();
  }

  update() {
    let html = '';

    if (storeManager.getData('selectedRow') !== undefined) {
      const record = storeManager.getSelectedRecord();
      if (record && record.id) {
        html = `<a class="hyper-text -internal" href="/variant/${record.id}">Detailed variant report page</a>`;

        this.elm.classList.remove('-disable');
      } else {
        html = `<a class="hyper-text -internal">Detailed variant report page</a>`;

        this.elm.classList.add('-disable');
      }
    }

    this.title.innerHTML = html;
  }
}
