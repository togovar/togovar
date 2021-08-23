import {ADVANCED_CONDITIONS} from '../global.js';

export default class ConditionValueEditorCheckboxes {

  constructor(values, conditionType) {

    // HTML
    const master = ADVANCED_CONDITIONS[conditionType];
    console.log(values.sections)
    const section = document.createElement('section');
    section.innerHTML = `
      <header>Select them</header>
      <ul class="checkboxes">${master.values.map(value => `
        <li>
          <label><input
            type="checkbox"
            value="${value.value}"
            data-label="${value.label}"
            ${conditionType === 'significance' ? `data-sign="${value.value}"` : ''}>
              ${conditionType === 'significance' ? `<span class="clinical-significance" data-sign="${value.value}"></span>` : ''}${value.label}
          </label>
        </li>`).join('')}
      </ul>`;
    values.sections.append(section);

    // references
    this._values = values;
    this._checkboxes = Array.from(section.querySelectorAll(':scope > ul > li > label > input'));

    // attach events
    this._checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this._updateCheckboxesEditor();
      });
    });

  }


  // public methods

  keepLastValues() {
    this._lastValues = Array.from(this._values.conditionView.valuesElement.querySelectorAll(':scope > .value')).map(value => value.dataset.value);
    console.log( this._lastValues )
  }

  restore() {
    this._checkboxes.forEach(checkbox => {
      const value = this._lastValues.find(value => value === checkbox.value);
      checkbox.checked = value !== undefined;
    });
    this._updateCheckboxesEditor();
  }


  // private methods

  _updateCheckboxesEditor() {

    // operation
    const valuesElement = this._values.conditionView.valuesElement;
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
    this._values.update(this._validate());
  }

  _validate() {
    return this._checkboxes.some(checkbox => checkbox.checked);
  }

}
