import StoreManager from './StoreManager.js';
import ConditionValueEditor from './ConditionValueEditor.js';
import '../components/ConditionItemValueView';
import { CONDITION_TYPE } from '../definition.js';

const OPTIONS = [
  '',
  ...[...Array(22)].map((_, index) => index + 1 + ''),
  'X',
  'Y',
];

export default class ConditionValueEditorLocation extends ConditionValueEditor {
  constructor(valuesView, conditionType) {
    super(valuesView, conditionType);

    // HTML
    this._createElement(
      'location-editor-view',
      `
    <header>Set location</header>
    <div class="body">
      <div class="row">
        <label class="chromosome">
          <span class="label">Chr:</span>
          <span class="form">
            <select>
              ${OPTIONS.map(
                (value) => `<option value="${value}">${value}</option>`
              ).join('')}
            </select>
          </span>
        </label>
        <label class="position">
          <span class="label"></span>
          <span class="form">
            <input class="start" type="number" min="0" placeholder="0">
            <span class="inter">-</span>
            <input class="end" type="number" min="0">
          </span>
        </label>
      </div>
    </div>`
    );

    // references
    const row = this._el.querySelector(':scope > .body > .row');
    this._chr = row.querySelector(':scope > .chromosome > .form > select');
    const inputs = Array.from(
      row.querySelectorAll(':scope > .position > .form > input')
    );
    this._start = inputs.find((input) => input.classList.contains('start'));
    this._end = inputs.find((input) => input.classList.contains('end'));

    // attach events
    [this._chr, ...inputs].forEach((input) => {
      input.addEventListener('change', (e) => {
        this._update(e);
      });
    });

    this._karyotype = StoreManager.getData('karyotype');
  }

  // public methods

  keepLastValues() {
    // this._lastValue = this._searchFieldView.value;
  }

  restore() {
    // this._searchFieldView.setTerm(this._lastValue);
    this._update();
  }

  search() {
    this._update();
  }

  get isValid() {
    if (this._chr.value === '') {
      return false;
    } else if (this._start.value && this._end.value) {
      return this._start.value < this._end.value;
    } else {
      return this._start.value || this._end.value;
    }
  }

  // private methods

  _update(e) {
    if (e.target === this._chr) {
      // reset input
      const reference = this._karyotype.reference;
      const region =
        this._karyotype.chromosomes[this._chr.value].region[reference];
      this._start.max = region[1];
      this._end.max = region[1];
      this._end.placeholder = region[1];
      if (this._start.value > region[1]) this._start.value = region[1];
      if (this._end.value > region[1]) this._end.value = region[1];
    }

    // update value
    const valueView = this._valueViews[0];
    if (this.isValid) {
      const value = `${this._chr.value}:${this._start.value}${
        this._start.value && this._end.value ? '-' : ''
      }${this._end.value}`;
      if (valueView) {
        //update
        valueView.label = value;
        valueView.value = value;
      } else {
        this._addValueView(value, value, true);
      }
    } else {
      this._removeValueView();
    }

    // validation
    this._valuesView.update(this._validate());
  }

  _validate() {
    return this.isValid;
  }
}
