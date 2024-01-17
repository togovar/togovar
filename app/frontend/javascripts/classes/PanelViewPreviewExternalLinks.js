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
          list.push(
            this.#createLinkList(
              'refSNP',
              record.external_link.dbsnp,
              rs => `http://identifiers.org/dbsnp/${rs}`
            )
          );
        }

        // ClinVar
        if (record.external_link.clinvar) {
          list.push(
            this.#createLinkList(
              'ClinVar',
              record.external_link.clinvar,
              vcv => `https://www.ncbi.nlm.nih.gov/clinvar/variation/${parseInt(vcv.replace('VCV', ''))}`
            )
          );
        }

        // gnomAD
        const recordFrequencies = record.frequencies.map(
          frequency => frequency.source
        );
        if (recordFrequencies.includes('gnomad_genomes')) {
          list.push(
            this.#createLinkList(
              'gnomAD',
              [`${record.chromosome}-${record.position}-${record.reference}-${record.alternate}`],
              variant => `https://gnomad.broadinstitute.org/variant/${variant}`
            )
          );
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

  #createLinkList(title, data, getUrl) {
    const content = `<ul>${data.map(item =>`<li><a href="${getUrl(item)}" class="hyper-text -external" target="_blank">${item}</a></li>`).join('')}</ul>`;
    return { title, content };
  }
}
