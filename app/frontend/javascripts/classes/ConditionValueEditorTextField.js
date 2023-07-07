import ConditionValueEditor from './ConditionValueEditor.js';
// import SearchField from '../components/Common/SearchField/SearchField.js';
import SearchFieldWithSuggestions from '../components/Common/SearchField/SearchFieldWithSuggestions.js';

export default class ConditionValueEditorTextField extends ConditionValueEditor {
  /**
   * @param {Object} valuesView - ConditionValues Object(_conditionView, _editors _okButton, _sections)
   * @param {String} conditionType - "gene" or "disease" or "variant"
   */

  constructor(valuesView, conditionType) {
    super(valuesView, conditionType);

    // HTML
    this._createElement(
      'text-field-editor-view',
      `<header>Search for ${conditionType.replace('_', ' ')}</header>
      <div class="body"></div>`
    );

    this._searchFieldView = new SearchFieldWithSuggestions(
      'Type a gene symbol or name',
      'https://grch37.togovar.org/api/search/gene',
      'term',
      this._body,
      { id: 'id', value: 'symbol' }
    );

    // new SearchField(
    //   {
    //     suggestAPIURL: 'https://grch37.togovar.org/api/search/gene',
    //     suggestAPIQueryParam: 'term',
    //   },
    //   'gene',
    //   { id: 'id', value: 'symbol' },
    //   this._body
    // );

    const handleSuggestSelect = () => {
      this._update();
    };

    this._searchFieldView.addEventListener(
      'new-suggestion-selected',
      handleSuggestSelect
    );
  }

  // public methods

  keepLastValues() {
    this._lastValue = this._searchFieldView.label;
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
