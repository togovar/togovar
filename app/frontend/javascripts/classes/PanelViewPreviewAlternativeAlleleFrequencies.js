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
    this._master = StoreManager.getSearchConditionMaster('dataset').items;
    // make DOM
    tbody.innerHTML = this._master.map(dataset => {
      if (dataset.has_freq) {
        return `<tr data-dataset="${dataset.id}">
          <td>
            <div class="dataset-icon" data-dataset="${dataset.id}">
              <div class="properties"></div>
            </div>
            ${dataset.label}
          </td>
          <td class="alt"></td>
          <td class="total"></td>
          <td class="frequency"></td>
        </tr>`;
      } else {
        return '';
      }
    }).join('');
    // set DOM reference
    this._datasets = {};
    for (const dataset of this._master) {
      if (dataset.has_freq) {
        const tr = tbody.querySelector(`tr[data-dataset="${dataset.id}"]`);
        this._datasets[dataset.id] = {
          alt: tr.querySelector('.alt'),
          total: tr.querySelector('.total'),
          frequency: tr.querySelector('.frequency')
        };
      }
    }
  }

  selectedRow() {
    this._update();
  }

  offset() {
    this._update();
  }

  _update() {
    if (StoreManager.getData('selectedRow') !== undefined) {
      const record = StoreManager.getSelectedRecord();
      if (record) {
        for (const dataset of this._master) {
          if (dataset.has_freq) {
            const frequency = record.frequencies ? record.frequencies.find(frequency => frequency.source === dataset.id) : null;
            if (frequency) {
              this._datasets[dataset.id].alt.textContent = frequency.allele.count.toLocaleString();
              this._datasets[dataset.id].total.textContent = frequency.allele.number.toLocaleString();
              switch (true) {
                case (frequency.allele.frequency === 0 || frequency.allele.frequency === 1):
                  this._datasets[dataset.id].frequency.textContent = frequency.allele.frequency;
                  break;
                default:
                  this._datasets[dataset.id].frequency.textContent = frequency.allele.frequency.toExponential(2);
                  break;
              }
            } else {
              this._datasets[dataset.id].alt.textContent = '';
              this._datasets[dataset.id].total.textContent = '';
              this._datasets[dataset.id].frequency.textContent = '';
            }
          }
        }
      }
    }
  }
}
