import PanelView from './PanelView.js';
import { storeManager } from '../store/StoreManager';

export default class PanelViewPreviewExternalLinks extends PanelView {
  constructor(elm) {
    super(elm, 'dataset');
    storeManager.bind('selectedRow', this);
    storeManager.bind('offset', this);
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
    if (storeManager.getData('selectedRow') !== undefined) {
      const record = storeManager.getSelectedRecord(),
        list = [];
      if (record && record.external_link) {
        // resSNP
        if (record.external_link.dbsnp) {
          record.external_link.dbsnp.forEach((item) => {
            list.push(this.#createLinkList('refSNP', item.title, item.xref));
          });
        }

        // MGeND
        if (record.external_link.mgend) {
          record.external_link.mgend.forEach((item) => {
            list.push(this.#createLinkList('MGeND', item.title, item.xref));
          });
        }

        // ClinVar
        if (record.external_link.clinvar) {
          record.external_link.clinvar.forEach((item) => {
            list.push(this.#createLinkList('ClinVar', item.title, item.xref));
          });
        }

        //ToMMo
        if (record.external_link.tommo) {
          record.external_link.tommo.forEach((item) => {
            list.push(this.#createLinkList('ToMMo', item.title, item.xref));
          });
        }

        // gnomAD
        if (record.external_link.gnomad) {
          record.external_link.gnomad.forEach((item) => {
            list.push(this.#createLinkList('gnomAD', item.title, item.xref));
          });
        }
      }

      if (list.length > 0) {
        html = `
                  <tbody>
                    ${list
                      .map(
                        (item) =>
                          `<tr><th>${item.title}</th><td>${item.content}</td></tr>`
                      )
                      .join('')}
                  </tbody>
                `;
        this.elm.classList.remove('-notfound');
      }
    }
    this.table.innerHTML = html;
  }

  #createLinkList(title, label, url) {
    const content = `
      <ul>
        <li><a href="${url}" class="hyper-text -external" target="_blank">${label}</a></li>
      </ul>`;
    return { title, content };
  }
}
