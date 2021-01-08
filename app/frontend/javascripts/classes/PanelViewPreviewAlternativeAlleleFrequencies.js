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
              // 頻度情報があれば頻度情報を表示
              this._datasets[dataset.id].alt.textContent = frequency.allele.count.toLocaleString();
              this._datasets[dataset.id].total.textContent = frequency.allele.number.toLocaleString();
              if ((frequency.allele.frequency + '').length > DECIMAL_DIGIT + 2) {
                // 規定の桁数より大きい少数の場合、規定の少数に丸める。0になる場合は指数で表示
                const numOfDigits = (frequency.allele.frequency + '').length;
                const integerized = ((frequency.allele.frequency * 10 ** numOfDigits) + '').padStart(numOfDigits, '0');
                const rounded = Math.round(parseFloat(integerized.slice(0, DECIMAL_DIGIT) + '.' + integerized.slice(DECIMAL_DIGIT)));
                const floated = rounded / 10 ** DECIMAL_DIGIT;
                this._datasets[dataset.id].frequency.textContent = floated > 0 ? floated : frequency.allele.frequency.toExponential(DECIMAL_DIGIT - 1);
              } else {
                this._datasets[dataset.id].frequency.textContent = strIns((Math.round(frequency.allele.frequency * 10 ** DECIMAL_DIGIT) + '').padStart(DECIMAL_DIGIT + 1, '0'), -DECIMAL_DIGIT, '.');
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