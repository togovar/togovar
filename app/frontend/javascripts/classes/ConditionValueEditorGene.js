import ConditionValueEditor from './ConditionValueEditor.js';
import SearchFieldWithSuggestions from '../components/Common/SearchField/SearchFieldWithSuggestions.js';
import { API_URL } from '../global.js';

/** Gene Search editing screen */
class ConditionValueEditorGene extends ConditionValueEditor {
  /**
   * @param {ConditionValues} valuesView
   * @param {String} conditionType - "gene" */
  constructor(valuesView, conditionType) {
    super(valuesView, conditionType);
    /** @property {number} _value - value of the selected suggestion */
    this._value;
    /** @property {string} _label - label of the selected suggestion */
    this._label;

    // HTML
    this._createElement(
      'text-field-editor-view',
      `<header>Search for ${conditionType}</header>
      <div class="body"></div>`
    );

    /** @property {HTMLDivElement} _searchFieldView - CustomElement */
    this._searchFieldView = new SearchFieldWithSuggestions(
      'BRCA2',
      `${API_URL}/api/search/${conditionType}`,
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
    this._lastValue = this._value || '';
    this._lastLabel = this._label || '';
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
    this._update();
  };

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
  /** You can press the ok button if there is condition-item-value-view
   * @type {boolean} */
  get isValid() {
    return this._valueViews.length > 0;
  }
}

export default ConditionValueEditorGene;
