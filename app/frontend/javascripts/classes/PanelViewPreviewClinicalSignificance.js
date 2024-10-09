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

  // TODO: 10/20にこの表示で良いかを確認
  update() {
    let html = '';
    if (StoreManager.getData('selectedRow') !== undefined) {
      const record = StoreManager.getSelectedRecord();
      if (record && record.significance) {
        const master = StoreManager.getSimpleSearchConditionMaster('significance');
        html = record.significance.map(significance => `
        <dl class="above-headline">
          <dt>
            <a href="/disease/${significance.conditions[0].medgen}" target="_blank" class="hyper-text -internal">
              ${significance.conditions[0].name}
            </a>
          </dt>
          ${significance.interpretations ?
            significance.interpretations.map(interpretation => `
            <dd>
              <div class="clinical-significance" data-value="${interpretation}">
                ${master.items.find(item => item.id === interpretation).label}
              </div>
              <div class="disease-category">
                <span class="mgend">${significance.conditions[0].medgen ? 'MGeND' : ''}</span>
                <span class="clinvar">${significance.conditions[0].name ? 'ClinVar' : ''}</span>
              </div >
            </dd > `).join('') :
            ''
          }
          </dl>`).join('');
        this.elm.classList.remove('-notfound');
      }
    } else {
      this.elm.classList.add('-notfound');
    }
    this.content.innerHTML = html;
  }

}
