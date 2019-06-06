import {DATASETS, strIns} from '../global.js';
import PanelView from "./PanelView.js";
import StoreManager from "./StoreManager.js";

const DECIMAL_DIGIT = 4;

export default class PanelViewPreviewAlternativeAlleleFrequencies extends PanelView {

  constructor(elm) {
    super(elm, 'frenquecies');
    StoreManager.bind('selectedRow', this);
    StoreManager.bind('offset', this);
    const tbody = this.elm.querySelector('.frequency-detail > tbody');
    this.datasets = {};
    for (const dataset in DATASETS) {
      const tr = tbody.querySelector(`tr[data-dataset="${dataset}"]`);
      if (tr) {
        this.datasets[dataset] = {
          alt: tr.querySelector('.alt'),
          total: tr.querySelector('.total'),
          frequency: tr.querySelector('.frequency')
        };
      }
    }
  }

  selectedRow() {
    this.update();
  }

  offset() {
    this.update();
  }

  update() {
    for (const dataset in DATASETS) {
      if (this.datasets[dataset]) {
        this.datasets[dataset].alt.textContent = '';
        this.datasets[dataset].total.textContent = '';
        this.datasets[dataset].frequency.textContent = '';
      }
    }
    if (StoreManager.getData('selectedRow') !== undefined) {
      const record = StoreManager.getSelectedRecord();
      if (record) {
        for (const dataset in DATASETS) {
          const frequency = record.frequencies.find(frequency => frequency.source === DATASETS[dataset].search);
          if (frequency) {
            this.datasets[dataset].alt.textContent = frequency.num_alt_alleles.toLocaleString();
            this.datasets[dataset].total.textContent = frequency.num_alleles.toLocaleString();
            this.datasets[dataset].frequency.textContent = strIns((Math.round(frequency.frequency * 10 ** DECIMAL_DIGIT) + '').padStart(DECIMAL_DIGIT + 1, '0'), -DECIMAL_DIGIT, '.');
          }
        }
      }
    }
  }
}
