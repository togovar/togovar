import StoreManager from './StoreManager.js';
import ConditionValueEditor from './ConditionValueEditor.js';
import '../components/ConditionItemValueView';
import { CONDITION_TYPE } from '../definition.js';

const OPTIONS = [
  '',
  ...[...Array(22)].map((_, index) => index + 1 + ''),
  'X',
  'Y',
  'MT',
];

export default class ConditionValueEditorLocation extends ConditionValueEditor {
  constructor(valuesView, conditionType, defaultValues) {
    super(valuesView, conditionType);

    // HTML
    this._createElement(
      'location-editor-view',
      `
    <header>Set location</header>
    <div class="body">
      <div class="row">
        <label>
          <input type="checkbox" name="range-or-position" value="single_position"> Single position
        </label>
      </div>
      <div class="row">
        <label class="chromosome">
          <span class="label">Chr.</span>
          <span class="form">
            <select>
              ${OPTIONS.map(
                (value) => `<option value="${value}">${value}</option>`
              ).join('')}
            </select>
          </span>
          <span class="label">&nbsp;:&nbsp;&nbsp;</span>
        </label>
        <label class="position">
          <span class="form range-inputs-view" data-type="range">
            <input class="start" type="number" min="1" placeholder="1">
            <span class="line"></span>
            <input class="end" type="number" min="1">
          </span>
        </label>
      </div>
    </div>`
    );

    // references
    const rows = this._el.querySelectorAll(':scope > .body > .row');
    this._chr = rows[1].querySelector(':scope > .chromosome > .form > select');
    this._rangeInputView = rows[1].querySelector(
      ':scope > .position > .range-inputs-view'
    );
    const inputs = Array.from(
      this._rangeInputView.querySelectorAll(':scope > input')
    );
    this._start = inputs.find((input) => input.classList.contains('start'));
    this._end = inputs.find((input) => input.classList.contains('end'));

    // attach events
    this._el
      .querySelector(':scope > .body > .row:nth-child(1) > label > input')
      .addEventListener('change', (e) => {
        this._rangeInputView.dataset.type = e.target.checked
          ? 'single_position'
          : 'region';
        this._update();
      });
    [this._chr, ...inputs].forEach((input) => {
      input.addEventListener('change', (e) => {
        this._update(e);
      });
    });

    this._karyotype = StoreManager.getData('karyotype');

    // default values
    if (defaultValues) {
      this._chr.value = defaultValues.chr;
      this._start.value = +defaultValues.start;
      this._end.value = +defaultValues.end;
      this._update();
    }
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
    } else {
      switch (this._rangeInputView.dataset.type) {
        case 'region':
          return (
            this._start.value !== '' &&
            this._end.value !== '' &&
            +this._start.value < +this._end.value
          );
        case 'single_position':
          return this._start.value !== '';
      }
    }
  }

  // private methods

  _update(e) {
    // if chromosome changed, change ranges
    if (e?.target === this._chr) {
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
        this._rangeInputView.dataset.type === 'single_position'
          ? ''
          : `-${this._end.value}`
      }`;
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
