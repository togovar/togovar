import {ADVANCED_CONDITIONS} from '../global.js';
import {conditionItemType} from '../definition.js';

export default class ConditionValues {

  constructor(conditionView) {

    this._conditionView = conditionView;

    // HTML
    conditionView.editorElement.innerHTML = `
    <div class="sections"></div>
    <div class="buttons">
      <button class="button-view -disabled">OK</button>
      <button class="button-view -negative">Cancel</button>
    </div>
    `;

    // references
    this._sections = conditionView.editorElement.querySelector(':scope > .sections');
    const buttons = conditionView.editorElement.querySelector(':scope > .buttons');
    this._okButton = buttons.querySelector(':scope > .button-view:nth-child(1)');

    // events
    this._okButton.addEventListener('click', () => this._clickOkButton());
    buttons.querySelector(':scope > .button-view:nth-child(2)').addEventListener('click', () => this._clickCancelButton());

    // initialization by types
    switch (conditionView.type) {
      case 'type':
      case 'significance':
        this._makeCheckboxesEditor();
        this._evaluate = this._evaluateCheckboxesEditor;
      break;
    }

  }


  // public methods

  start() {
    // save values
    this._lastValues = Array.from(this._conditionView.valuesElement.querySelectorAll(':scope > .value')).map(value => value.dataset.value);
    console.log( this._lastValues )
  }


  // private methods

  _clickOkButton() {
    // 
    this._conditionView.doneEditing();
  }

  _clickCancelButton() {
    if (this._conditionView.isFirstTime) {
      // delete for the first time 
      this._conditionView.remove();
    } else {
      // otherwise, revert to the previous state 
      this._checkboxes.forEach(checkbox => {
        const value = this._lastValues.find(value => value === checkbox.value);
        checkbox.checked = value !== undefined;
      });
      this._updateCheckboxesEditor();
      this._conditionView.doneEditing();
    }
  }

  _makeCheckboxesEditor() {

    // HTML
    const type = this._conditionView.type;
    const master = ADVANCED_CONDITIONS[type];
    this._sections.innerHTML = `
    <section>
      <header>Select them</header>
      <ul class="checkboxes">${master.values.map(value => `
      <li>
        <label><input type="checkbox" value="${value.value}" data-label="${value.label}"${type === 'significance' ? ` data-sign="${value.value}"` : ''}>${type === 'significance' ? `<span class="clinical-significance" data-sign="${value.value}"></span>` : ''}${value.label}</label>
      </li>`).join('')}</ul>
    </section>
    `;

    // references
    this._checkboxes = Array.from(this._sections.querySelectorAll(':scope > section > ul > li > label > input'));

    // attach events
    this._checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
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
    if (this._evaluate()) {
      console.log('ok')
      this._okButton.classList.remove('-disabled');
    } else {
      console.log('boooo')
      this._okButton.classList.add('-disabled');
    }

  }

  _evaluateCheckboxesEditor() {
    return this._checkboxes.some(checkbox => checkbox.checked);
  }


  // accessor

  get type() {
    return conditionItemType.condition;
  }

}