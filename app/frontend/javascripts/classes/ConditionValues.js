import {ADVANCED_CONDITIONS} from '../global.js';


export default class ConditionValues {

  constructor(conditionView) {

    this._conditionView = conditionView;

    // HTML
    conditionView.editorElement.innerHTML = `
    <div class="sections"></div>
    <div class="buttons">
      <div class="button-view -disabled">OK</div>
      <div class="button-view -negative">Cancel</div>
    </div>
    `;
    this._sections = conditionView.editorElement.querySelector(':scope > .sections');

    switch (conditionView.type) {
      case 'type': this._makeCheckboxesEditor(); break;
    }

  }

  _makeCheckboxesEditor() {

    // HTML
    this._sections.innerHTML = `
    <section>
      <header>Select variant type</header>
      <ul class="checkboxes">${ADVANCED_CONDITIONS['type'].values.map(value => `
      <li>
        <label><input type="checkbox" value="${value.value}" data-label="${value.label}">${value.label}</label>
      </li>`).join('')}</ul>
    </section>
    `;

    // references
    this._checkboxes = this._sections.querySelectorAll(':scope > section > ul > li > label > input');

    // attach events
    this._checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        console.log(checkbox)
        this._updateCheckboxesEditor();
      });
    });

  }

  _updateCheckboxesEditor() {

    // operation
    const valueViews = Array.from(this._conditionView.valuesElement.querySelectorAll(':scope > .value'));
    this._checkboxes.forEach(checkbox => {
      const elm = valueViews.find(elm => elm.dataset.value === checkbox.value);
      if (checkbox.checked) {
        if (elm === undefined) {
          // add value element
          this._conditionView.valuesElement.insertAdjacentHTML('beforeend', `<span class="value" data-value="${checkbox.value}">${checkbox.dataset.label}</span>`);
        }
      } else {
        if (elm) {
          // remove value element
          this._conditionView.valuesElement.removeChild(elm);
        }
      }
    });

    // evaluation

  }

}