import ConditionValueEditor from './ConditionValueEditor.js';
import SearchFieldWithSuggestions from '../components/SearchField/suggestions/SearchFieldWithSuggestions.ts';
import { API_URL } from '../global.js';

/** Gene Search editing screen */
class ConditionValueEditorGene extends ConditionValueEditor {
  /**
   * @param {ConditionValues} valuesView
   * @param {ConditionItemView} conditionView */
  constructor(valuesView, conditionView) {
    super(valuesView, conditionView);
    /** @property {number} _value - value of the selected suggestion */
    this._value;
    /** @property {string} _label - label of the selected suggestion */
    this._label;

    // HTML
    this._createElement(
      'text-field-editor-view',
      `<header>Search for ${this._conditionType}</header>
      <div class="body"></div>`
    );

    /** @property {HTMLDivElement} _searchFieldView - CustomElement */
    this._searchFieldView = new SearchFieldWithSuggestions(
      'BRCA2',
      `${API_URL}/api/search/${this._conditionType}`,
      'term',
      this._body,
      {
        valueMappings: {
          valueKey: 'id',
          labelKey: 'symbol',
          aliasOfKey: 'alias_of',
        },
      }
    );

    this._searchFieldView.addEventListener(
      'new-suggestion-selected',
      this._handleSuggestSelect
    );
  }

  // public methods
  /** Retain value when changing to edit screen
   * See {@link ConditionValues} startToEditCondition */
  keepLastValues() {
    let valueView = this._valuesElement.querySelector(
      'condition-item-value-view'
    );

    this._lastValue = valueView?.value || '';
    this._lastLabel = valueView?.label || '';
  }

  /** If the cancel button is pressed when isFirstTime is false, restore the value before editing
   *  See {@link ConditionValues} _clickCancelButton */
  restore() {
    this._addValueView(this._lastValue, this._lastLabel, true);
  }

  // private methods
  /** Add condition-item-value-view with selected suggestion data
   * @private
   * @param {CustomEvent} e new-suggestion-selected (SearchElementWithSuggestions) */
  _handleSuggestSelect = (e) => {
    this._value = e.detail.id;
    this._label = e.detail.label;
    this._addValueView(this._value, this._label, true, false);
    this.#update();
  };

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

  //accessor
  /** You can press the ok button if there is condition-item-value-view
   * @type {boolean} */
  get isValid() {
    return this._valueViews.length > 0;
  }
}

export default ConditionValueEditorGene;
