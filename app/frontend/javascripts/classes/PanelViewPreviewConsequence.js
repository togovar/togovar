import PanelView from "./PanelView.js";
import StoreManager from "./StoreManager.js";

export default class PanelViewPreviewConsequence extends PanelView {

  constructor(elm) {
    super(elm, 'frenquecies');
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
      if (record && record.transcripts && record.transcripts.length > 0) {
        let accessions = record.transcripts.map(transcript => transcript.consequences).reduce((first, second) => first.concat(second));
        accessions = Array.from(new Set(accessions));
        const master = StoreManager.getSearchConditionMaster('consequence');
        const consequences = accessions.map(accession => master.items.find(consequence => consequence.id === accession));
        html = consequences.map(consequence => `<dl class="above-headline"><dt>${consequence.label}</dt><dd>${consequence.description}</dd></dl>`).join('');
        this.elm.classList.remove('-notfound');
      }
    }
    this.content.innerHTML = html;
  }
}
