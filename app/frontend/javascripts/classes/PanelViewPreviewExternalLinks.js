import PanelView from "./PanelView.js";
import StoreManager from "./StoreManager.js";

export default class PanelViewPreviewExternalLinks extends PanelView {
  constructor(elm) {
    super(elm, 'dataset');
    StoreManager.bind('selectedRow', this);
    StoreManager.bind('offset', this);
    this.table = this.elm.querySelector('.content > .right-headline');
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
      const
        record = StoreManager.getSelectedRecord(),
        list = [];
      if (record && record.external_link) {
        // resSNP
        if (record.external_link.dbsnp) {
          list.push({
            title: 'refSNP',
            content: `<ul>${(() => record.external_link.dbsnp.map(rs => `<li><a href="http://identifiers.org/dbsnp/${rs}" class="hyper-text -external" target="_blank">${rs}</a></li>`).join(''))()}</ul>`
          });
        }
        // ClinVar
        if (record.external_link.clinvar) {
          list.push({
            title: 'ClinVar',
            content: `<ul>${(() => record.external_link.clinvar.map(vcv => `<li><a href="https://www.ncbi.nlm.nih.gov/clinvar/variation/${parseInt(vcv.replace('VCV', ''))}" class="hyper-text -external" target="_blank">${vcv}</a></li>`).join(''))()}</ul>`
          });
        }
        if (list.length > 0) {
          html = `
            <tbody>
              ${list.map(item => `<tr><th>${item.title}</th><td>${item.content}</td></tr>`).join('')}
            </tbody>
          `;
          this.elm.classList.remove('-notfound');
        }
      }
    }
    this.table.innerHTML = html;
  }

}
