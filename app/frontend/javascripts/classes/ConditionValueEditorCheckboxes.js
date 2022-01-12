import ConditionValueEditor from "./ConditionValueEditor.js";
import {ADVANCED_CONDITIONS} from '../global.js';

export default class ConditionValueEditorCheckboxes extends ConditionValueEditor {

  constructor(valuesView, conditionType) {

    super(valuesView, conditionType);

    // HTML
    const master = ADVANCED_CONDITIONS[conditionType];
    this._createElement('checkboxes-editor-view', `
    <header>Select them</header>
    <ul class="checkboxes body">${master.values.map(value => `
      <li>
        <label><input
          type="checkbox"
          value="${value.value}"
          data-label="${value.label}"
          ${conditionType === 'significance' ? `data-sign="${value.value}"` : ''}>
            ${conditionType === 'significance' ? `<span class="clinical-significance" data-sign="${value.value}"></span>` : ''}${value.label}
        </label>
      </li>`).join('')}
    </ul>`);

    // references
    this._checkboxes = Array.from(this._el.querySelectorAll(':scope > ul > li > label > input'));

    // attach events
    this._checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this._update();
      });
    });

  }


  // public methods

  keepLastValues() {
    this._lastValues = Array.from(this._valuesView.conditionView.valuesElement.querySelectorAll(':scope > .value')).map(value => value.dataset.value);
    console.log( this._lastValues )
  }

  restore() {
    this._checkboxes.forEach(checkbox => {
      const value = this._lastValues.find(value => value === checkbox.value);
      checkbox.checked = value !== undefined;
    });
    this._update();
  }

  get isValid() {
    return this._checkboxes.some(checkbox => checkbox.checked);
  }

  // private methods

  _update() {

    // update values
    const valuesElement = this._valuesView.conditionView.valuesElement;
    const valueViews = Array.from(valuesElement.querySelectorAll(':scope > .value'));
    this._checkboxes.forEach(checkbox => {
      const elm = valueViews.find(elm => elm.dataset.value === checkbox.value);
      if (checkbox.checked) {
        if (elm === undefined) {
          // add value element
          valuesElement.insertAdjacentHTML('beforeend', `<span class="value" data-value="${checkbox.value}">${checkbox.dataset.label}</span>`);
        }
      } else {
        if (elm) {
          // remove value element
          valuesElement.removeChild(elm);
        }
      }
    });

    // validation
    this._valuesView.update(this._validate());
  }

  _validate() {
    return this.isValid;
  }

}
