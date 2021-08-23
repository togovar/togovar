import ConditionValueEditorCheckboxes from './ConditionValueEditorCheckboxes.js';
import ConditionValueEditorColumns from './ConditionValueEditorColumns.js';
import {ADVANCED_CONDITIONS} from '../global.js';
import {conditionItemType} from '../definition.js';

export default class ConditionValues {

  constructor(conditionView) {

    this._conditionView = conditionView;
    this._editors = [];

    // HTML
    conditionView.editorElement.innerHTML = `
      <div class="sections"></div>
      <div class="buttons">
        <button class="button-view -disabled">OK</button>
        <button class="button-view -negative">Cancel</button>
      </div>`;

    // references
    this._sections = conditionView.editorElement.querySelector(':scope > .sections');
    const buttons = conditionView.editorElement.querySelector(':scope > .buttons');
    this._okButton = buttons.querySelector(':scope > .button-view:nth-child(1)');

    // events
    this._okButton.addEventListener('click', this._clickOkButton.bind(this));
    buttons.querySelector(':scope > .button-view:nth-child(2)').addEventListener('click', this._clickCancelButton.bind(this));

    // initialization by types
    // TODO: conditionType は ADVANCED_CONDITIONS[conditionView.conditionType].type を参照して処理をスイッチさせたい
    console.log('conditionType:', conditionView.conditionType)
    switch (conditionView.conditionType) {
      case 'type':
      case 'significance':
        this._editors.push(new ConditionValueEditorCheckboxes(this, this._conditionView.conditionType));
      break;
      case 'consequence':
        this._editors.push(new ConditionValueEditorColumns(this, this._conditionView.conditionType));
      break;
    }

  }


  // public methods

  startToEditCondition() {
    // save values
    for (const editor of this._editors) {
      editor.keepLastValues();
    }
  }

  update(isValid) {
    if (isValid) {
      console.log('ok')
      this._okButton.classList.remove('-disabled');
    } else {
      console.log('boooo')
      this._okButton.classList.add('-disabled');
    }
  }


  // private methods

  _clickOkButton(e) {
    e.stopImmediatePropagation();
    // 
    this._conditionView.doneEditing();
  }

  _clickCancelButton(e) {
    e.stopImmediatePropagation();
    if (this._conditionView.isFirstTime) {
      // delete for the first time 
      this._conditionView.remove();
    } else {
      // otherwise, revert to the previous state 
      for (const editor of this._editors) {
        editor.restore();
      }
      this._conditionView.doneEditing();
    }
  }


  // accessor

  get type() {
    return conditionItemType.condition;
  }

  get conditionView() {
    return this._conditionView;
  }

  get sections() {
    return this._sections;
  }

}
