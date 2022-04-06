import PanelView from "./PanelView.js";
import StoreManager from "./StoreManager.js";

export default class PanelViewPreviewGene extends PanelView {
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
      const record = StoreManager.getSelectedRecord();
      if (record && record.symbols) {
        for (const symbol of record.symbols) {
          html += `
            <tbody>
              <tr>
                <th>Symbol</th>
                <td>
                  <a href="http://identifiers.org/hgnc/${symbol.id}" target="_blank" class="hyper-text -internal">${symbol.name}</a>
                </td>
              </tr>
              ${symbol.synonyms.length === 0 ? '' : `<tr><th>Alias</th><td>${symbol.synonyms.join(', ')}</td></tr>`}
            </tbody>
          `;

          this.elm.classList.remove('-notfound');
        }
      }
    }
    this.table.innerHTML = html;
  }

}
