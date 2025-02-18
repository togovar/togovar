import PanelView from './PanelView.js';
import { storeManager } from '../store/StoreManager';
import { getSimpleSearchConditionMaster } from '../store/searchManager';

export default class PanelViewPreviewConsequence extends PanelView {
  constructor(elm) {
    super(elm, 'frenquecies');
    storeManager.bind('selectedRow', this);
    storeManager.bind('offset', this);
    this._content = this.elm.querySelector('.content');
  }

  selectedRow() {
    this._update();
  }

  offset() {
    this._update();
  }

  _update() {
    let html = '';
    this.elm.classList.add('-notfound');
    if (storeManager.getData('selectedRow') !== undefined) {
      const record = storeManager.getSelectedRecord();
      if (record && record.transcripts && record.transcripts.length > 0) {
        // consequence の取り出し
        let accessions = record.transcripts
          .map((transcript) => transcript.consequence)
          .reduce((first, second) => first.concat(second));
        accessions = Array.from(new Set(accessions));
        const master = getSimpleSearchConditionMaster('consequence');
        const consequences = accessions.map((accession) =>
          master.items.find((consequence) => consequence.id === accession)
        );
        html = consequences
          .map(
            (consequence) =>
              `<dl class="above-headline"><dt>${consequence.label}</dt><dd>${consequence.description}</dd></dl>`
          )
          .join('');
        this.elm.classList.remove('-notfound');
      }
    }
    this._content.innerHTML = html;
  }
}
