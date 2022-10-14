import ConditionValueEditor from './ConditionValueEditor.js';
import SearchFieldView from './SearchFieldView.js';
import { CONDITION_TYPE } from '../definition.js';
import { API_URL } from '../global.js';

export default class ConditionValueEditorTextField extends ConditionValueEditor {
  /**
   * @param {Object} valuesView - ConditionType Object?(_conditionView, _editors _okButton, _sections)
   * @param {String} conditionType - "gene" or "disease"?
   */

  constructor(valuesView, conditionType) {
    super(valuesView, conditionType);
    this._conditionType = conditionType;

    // HTML
    this._createElement(
      'text-field-editor-view',
      `<header>Search for ${conditionType.replace('_', ' ')}</header>
      <div class="body"></div>`
    );

    this._searchFieldView = new SearchFieldView(
      this,
      this._body,
      {
        [CONDITION_TYPE.gene_symbol]: 'BRCA2',
        [CONDITION_TYPE.disease]: 'Breast-ovarian cancer, familial 2',
      }[conditionType],
      {
        [CONDITION_TYPE.gene_symbol]: 'gene',
        [CONDITION_TYPE.disease]: 'disease',
      }[conditionType],
      `${API_URL}/api/search/${conditionType}?term=`,
      conditionType
    );
  }

  // public methods

  keepLastValues() {
    this._lastValue = this._searchFieldView.value;
  }

  restore() {
    this._searchFieldView.setTerm(this._lastValue);
    this._update();
  }

  search() {
    this._update();
  }

  get isValid() {
    return this._searchFieldView.value !== '';
  }

  // private methods

  _update() {
    // update value
    const value = this._searchFieldView.value;
    const label = this._searchFieldView.label;

    this._addValueView(value, label, true);

    // validation
    this._valuesView.update(this._validate());
  }

  _validate() {
    return this.isValid;
  }
}
