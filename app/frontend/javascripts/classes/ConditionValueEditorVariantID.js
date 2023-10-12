import ConditionValueEditor from './ConditionValueEditor.js';
import SearchFieldOnly from '../components/Common/SearchField/SearchFieldOnly.js';

/** Variant ID editing screen */
class ConditionValueEditorVariantID extends ConditionValueEditor {
  /**
   * @param {ConditionValues} valuesView - _cancelButton{HTMLButtonElement}, _conditionView{ConditionItemView}, _editors{ConditionValueEditorVariantID[]}, _okButton{HTMLButtonElement}, _sections{HTMLDivElement}
   * @param {String} conditionType - "id" */
  constructor(valuesView, conditionType) {
    super(valuesView, conditionType);

    // HTML
    this._createElement(
      'text-field-editor-view',
      `<header>Search for ${conditionType}</header>
      <div class="body"></div>`
    );

    /** @property {HTMLDivElement} _searchFieldView - CustomElement */
    this._searchFieldView = new SearchFieldOnly(this._body, 'rs1489251879');

    this._searchFieldView.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const id = this._searchFieldView.value;

        if (this._searchFieldView.value.trim().length > 0) {
          this._addValueView(id, id, false, true);
          this._update();
          this._searchFieldView.value = '';
        }
      }
    });
  }

  // public methods
  /** Retain _valueViews when changing to edit screen
   * See {@link ConditionValues} startToEditCondition */
  keepLastValues() {
    this._lastValueViews = this._valueViews;
  }

  /** If the cancel button is pressed when isFirstTime is false, restore the _valueViews before editing
   * See {@link ConditionValues} _clickCancelButton */
  restore() {
    this._updateValueViews(this._lastValueViews);
  }

  // private methods
  /** Change whether okbutton can be pressed
   * @private */
  _update() {
    this._valuesView.update(this._validate());
  }

  /** Whether you can press the ok button
   * @private
   * @returns {boolean} */
  _validate() {
    return this.isValid;
  }

  //accessor
  /** In the case of variant ID, you can press the ok button at any time even if there is no condition-item-value-view.
   * @type {boolean} */
  get isValid() {
    return true;
  }
}

export default ConditionValueEditorVariantID;
