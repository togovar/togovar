import PanelView from "./PanelView.js";
import StoreManager from "./StoreManager.js";

export default class PanelViewPreviewClinicalSignificance extends PanelView {

  constructor(elm) {
    super(elm, 'clinicalSignificance');
    StoreManager.bind('selectedRow', this);
    StoreManager.bind('offset', this);
    this.content = this.elm.querySelector('.content');
  }

  selectedRow() {
    this.update();
  }

  offset() {
    this.update();
  }

  update() {
    let html = '';
    this.elm.classList.add('-notfound');
    if (StoreManager.getData('selectedRow') !== undefined) {
      const record = StoreManager.getSelectedRecord();
      if (record && record.significance.length) {
        html = record.significance.map(significance => `<dl class="above-headline"><dt><a href="#" class="hyper-text -internal">${significance.condition}</a></dt>${
          significance.interpretations ?
            significance.interpretations.map(interpretation => `<dd><div class="clinical-significance" data-sign="${interpretation}"></div>${interpretation.charAt(0).toUpperCase() + interpretation.slice(1)}</dd>`).join('') :
            ''
          }</dl>`).join('');
        this.elm.classList.remove('-notfound');
      }
    }
    this.content.innerHTML = html;
  }
}
