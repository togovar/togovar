import {ADVANCED_CONDITIONS} from '../global.js';


export default class ConditionEditorView {

  constructor(conditionView, elm, type) {

    elm.innerHTML = `
    <div class="sections"></div>
    <div class="buttons">
      <div class="button-view -disabled">OK</div>
      <div class="button-view -negative">Cancel</div>
    </div>
    `;
    this._sections = elm.querySelector(':scope > .sections');

    switch (type) {
      case 'type': this._makeTypeEditor();
        break;
    }

  }

  _makeTypeEditor() {
    this._sections.innerHTML = `
    <section>
      <header>Select variant type</header>
      <ul class="checkboxes">${ADVANCED_CONDITIONS['type'].values.map(value => `
      <li>
        <label><input type="checkbox" value="${value.value}">${value.label}</label>
      </li>`).join('')}</ul>
    </section>
    `;
  }

}