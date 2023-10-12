import ConditionValueEditorCheckboxes from './ConditionValueEditorCheckboxes.js';
import ConditionValueEditorColumns from './ConditionValueEditorColumns.js';
import ConditionValueEditorGene from './ConditionValueEditorGene.js';
import ConditionValueEditorVariantID from './ConditionValueEditorVariantID.js';
import ConditionValueEditorFrequencyCount from './ConditionValueEditorFrequencyCount.js';
import ConditionValueEditorLocation from './ConditionValueEditorLocation.js';
import ConditionValueEditorDisease from './ConditionValueEditorDisease.js';
import { CONDITION_TYPE } from '../definition.js';

/** About the AdvancedSearch edit screen.
 * Create an instance of ConditionValueEditors */
class ConditionValues {
  /**
   * @param {ConditionItemView} conditionView
   * @param {0|1} defaultValues ConditionItemView represents "0", ConditionGroupView represents "1". */
  constructor(conditionView, defaultValues) {
    /** @property {ConditionItemView} _conditionView */
    this._conditionView = conditionView;
    /** @property {ConditionValueEditorCheckboxes[]|ConditionValueEditorColumns[]|ConditionValueEditorFrequencyCount[]|ConditionValueEditorDisease[]|ConditionValueEditorTextField[]} _editor */
    this._editors = [];

    // HTML
    conditionView.editorElement.innerHTML = `
      <div class="sections"></div>
      <div class="buttons">
        <button class="button-view -disabled">OK</button>
        <button class="button-view -negative">Cancel</button>
      </div>`;

    // references
    /** @property {HTMLDivElement} _sections - div.sections */
    this._sections =
      conditionView.editorElement.querySelector(':scope > .sections');
    const buttons =
      conditionView.editorElement.querySelector(':scope > .buttons');
    /** @property {HTMLButtonElement} _okButton - button.button-view */
    this._okButton = buttons.querySelector(
      ':scope > .button-view:nth-child(1)'
    );

    // events
    this._okButton.addEventListener('click', this._clickOkButton.bind(this));
    buttons
      .querySelector(':scope > .button-view:nth-child(2)')
      .addEventListener('click', this._clickCancelButton.bind(this));

    /** initialization by types */
    switch (conditionView.conditionType) {
      case CONDITION_TYPE.type:
      case CONDITION_TYPE.significance:
        this._editors.push(
          new ConditionValueEditorCheckboxes(this, this._conditionView)
        );
        break;

      case CONDITION_TYPE.consequence:
        this._editors.push(
          new ConditionValueEditorColumns(this, this._conditionView)
        );
        break;

      case CONDITION_TYPE.dataset:
        this._editors.push(
          new ConditionValueEditorColumns(this, this._conditionView)
        );
        this._editors.push(
          new ConditionValueEditorFrequencyCount(this, this._conditionView)
        );
        break;

      case CONDITION_TYPE.disease:
        this._editors.push(
          new ConditionValueEditorDisease(this, this._conditionView)
        );
        break;

      case CONDITION_TYPE.gene_symbol:
        this._editors.push(
          new ConditionValueEditorGene(this, this._conditionView)
        );
        break;

      case CONDITION_TYPE.variant_id:
        this._editors.push(
          new ConditionValueEditorVariantID(this, this._conditionView)
        );
        break;

      case CONDITION_TYPE.location:
        this._editors.push(
          new ConditionValueEditorLocation(
            this,
            this._conditionView,
            defaultValues
          )
        );
        break;
    }
  }

  // public methods
  /** Retains the value of ConditionValueEditor once editing starts */
  startToEditCondition() {
    for (const editor of this._editors) {
      editor.keepLastValues();
    }
  }

  /** Whether isValid(whether condition has a value) is true or false and okButton is disabled
   * @param {boolean} isValid - whether you can press the ok button */
  update(isValid) {
    if (this._conditionView.conditionType === CONDITION_TYPE.dataset) {
      isValid = this._editors.every((editor) => {
        return editor.isValid;
      });
    }
    if (isValid) {
      this._okButton.classList.remove('-disabled');
    } else {
      this._okButton.classList.add('-disabled');
    }
  }

  // private methods
  /** If isFirstTime is false and there is no Node in values, delete conditionView. Otherwise finish editing
   * @private
   * @param {MouseEvent} e - click event */
  _clickOkButton(e) {
    e.stopImmediatePropagation();

    this._conditionView.doneEditing();
  }

  /** When isFirstTime is true, remove conditionView. Otherwise, revert to the state before editing.
   * @private
   * @param {MouseEvent} e - click event */
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
  /** @type {ConditionItemView} */
  get conditionView() {
    return this._conditionView;
  }

  /** div.sections
   * @type {HTMLDivElement} */
  get sections() {
    return this._sections;
  }
}

export default ConditionValues;
