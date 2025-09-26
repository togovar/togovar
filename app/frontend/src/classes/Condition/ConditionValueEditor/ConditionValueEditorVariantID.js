import { ConditionValueEditor } from './ConditionValueEditor.ts';
import SearchField from '../../../components/SearchField/SearchField';

/** Variant ID editing screen */
class ConditionValueEditorVariantID extends ConditionValueEditor {
  /**
   * @param {ConditionValues} valuesView - _cancelButton{HTMLButtonElement}, _conditionView{ConditionItemView}, _editors{ConditionValueEditorVariantID[]}, _okButton{HTMLButtonElement}, _sections{HTMLDivElement}
   * @param {ConditionItemView} conditionView */
  constructor(valuesView, conditionView) {
    super(valuesView, conditionView);

    // HTML
    this._createElement(
      'text-field-editor-view',
      `<header>Search for ${this._conditionType}</header>
      <div class="body"></div>`
    );

    /** @property {HTMLDivElement} _searchFieldView - CustomElement */
    this._searchFieldView = new SearchField(this._body, 'rs1489251879');

    this._searchFieldView.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const id = this._searchFieldView.value;

        if (this._searchFieldView.value.trim().length > 0) {
          this._addValueView(id, id, false, true);
          this.#update();
          this._searchFieldView.value = '';
        }
      }
    });

    this._valuesView.conditionView.elm?.addEventListener(
      'delete-condition-item',
      this.#handleDeleteValue.bind(this)
    );
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
  #update() {
    this._valuesView.update(this.#validate());
  }

  /** Whether you can press the ok button
   * @private
   * @returns {boolean} */
  #validate() {
    return this.isValid;
  }

  /** Delete value and _update when value's button.delete is pressed on edit screen
   * @private
   * @param {Event} e */
  #handleDeleteValue(e) {
    e.stopPropagation();
    this._removeValueView(e.detail);
    this.#update();
  }

  //accessor
  /** Valid if there is a node in div.values
   * @type {boolean} */
  get isValid() {
    return this._conditionView.valuesElement.hasChildNodes();
  }
}

export default ConditionValueEditorVariantID;
