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
    if (StoreManager.getData('selectedRow') !== undefined) {
      const record = StoreManager.getSelectedRecord();
      if (record && record.significance) {
        const master = StoreManager.getSearchConditionMaster('significance');
        html = record.significance.map(significance => `<dl class="above-headline"><dt><a>${significance.condition}</a></dt>${
          significance.interpretations ?
            significance.interpretations.map(interpretation => `<dd><div class="clinical-significance" data-sign="${interpretation}"></div>${master.items.find(item => item.id === interpretation).label}</dd>`).join('') :
            ''
          }</dl>`).join('');
        this.elm.classList.remove('-notfound');
      }
    } else {
      this.elm.classList.add('-notfound');
    }
    this.content.innerHTML = html;
  }

}