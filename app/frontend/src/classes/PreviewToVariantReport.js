import PanelView from './PanelView.ts';
import { storeManager } from '../store/StoreManager';

const REPORT_LABEL = 'Detailed variant report page';

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
    const selectedRow = storeManager.getData('selectedRow');
    const record =
      selectedRow !== undefined ? storeManager.getSelectedRecord() : null;

    if (record && record.id) {
      const link = document.createElement('a');
      link.classList.add('hyper-text', '-internal');
      link.href = `/variant/${encodeURIComponent(String(record.id))}`;
      link.textContent = REPORT_LABEL;

      this.elm.classList.remove('-disable');
      this.title.replaceChildren(link);
      return;
    }

    const label = document.createElement('span');
    label.classList.add('hyper-text', '-internal');
    label.textContent = REPORT_LABEL;

    this.elm.classList.add('-disable');
    this.title.replaceChildren(label);
  }
}
