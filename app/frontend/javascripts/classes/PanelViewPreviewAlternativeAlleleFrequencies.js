import {strIns} from '../global.js';
import PanelView from "./PanelView.js";
import StoreManager from "./StoreManager.js";

const DECIMAL_DIGIT = 4;

export default class PanelViewPreviewAlternativeAlleleFrequencies extends PanelView {

  constructor(elm) {
    super(elm, 'frenquecies');
    StoreManager.bind('selectedRow', this);
    StoreManager.bind('offset', this);
    const tbody = this.elm.querySelector('.frequency-detail > tbody');
    this.master = StoreManager.getSearchConditionMaster('dataset').items;
    this.datasets = {};
    for (const dataset of this.master) {
      const tr = tbody.querySelector(`tr[data-dataset="${dataset.id}"]`);
      if (tr) {
        this.datasets[dataset.id] = {
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
    for (const dataset of this.master) {
      if (this.datasets[dataset.id]) {
        this.datasets[dataset.id].alt.textContent = '';
        this.datasets[dataset.id].total.textContent = '';
        this.datasets[dataset.id].frequency.textContent = '';
      }
    }
    if (StoreManager.getData('selectedRow') !== undefined) {
      const record = StoreManager.getSelectedRecord();
      if (record) {
        for (const dataset of this.master) {
          const frequency = record.frequencies.find(frequency => frequency.source === dataset.id);
          if (frequency) {
            this.datasets[dataset.id].alt.textContent = frequency.num_alt_alleles.toLocaleString();
            this.datasets[dataset.id].total.textContent = frequency.num_alleles.toLocaleString();
            if ((frequency.frequency + '').length > DECIMAL_DIGIT + 2) {
              this.datasets[dataset.id].frequency.textContent = frequency.frequency.toExponential(DECIMAL_DIGIT - 1);
            } else {
              this.datasets[dataset.id].frequency.textContent = strIns((Math.round(frequency.frequency * 10 ** DECIMAL_DIGIT) + '').padStart(DECIMAL_DIGIT + 1, '0'), -DECIMAL_DIGIT, '.');
            }
          }
        }
      }
    }
  }
}
