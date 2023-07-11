import ConditionValueEditor from './ConditionValueEditor.js';
import SearchFieldWithSuggestions from '../components/Common/SearchField/SearchFieldWithSuggestions.js';
import SearchFieldSimple from '../components/Common/SearchField/SearchFieldSimple.js';

export default class ConditionValueEditorTextField extends ConditionValueEditor {
  /**
   * @param {Object} valuesView - ConditionValues Object(_conditionView, _editors _okButton, _sections)
   * @param {String} conditionType - "gene" or "disease" or "id" (for variant id)
   */

  constructor(valuesView, conditionType) {
    super(valuesView, conditionType);

    // HTML
    this._createElement(
      'text-field-editor-view',
      `<header>Search for ${conditionType.replace('_', ' ')}</header>
      <div class="body"></div>`
    );

    if (conditionType === 'gene') {
      this._searchFieldView =
        this._body.querySelector('search-field-with-suggestions') ||
        new SearchFieldWithSuggestions(
          'Type a gene symbol or name',
          'https://grch37.togovar.org/api/search/gene',
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

      const handleSuggestSelect = (e) => {
        this._data = {
          value: e.detail.id,
          label: e.detail.label,
        };
        this._update();
      };

      this._searchFieldView.addEventListener(
        'new-suggestion-selected',
        handleSuggestSelect
      );
    } else if (conditionType === 'id') {
      this._searchFieldView =
        this._body.querySelector('search-field-simple') ||
        new SearchFieldSimple(this._body, 'Enter a variant');

      this._searchFieldView.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const id = this._searchFieldView.value;

          if (this._searchFieldView.value.trim().length > 0) {
            this._data = {
              value: id,
              label: id,
            };
            this._update(false);

            this._searchFieldView.value = '';
          }
        }
      });
    }
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

  _update(isOnly = true) {
    // update value

    this._addValueView(this._data.value, this._data.label, isOnly);

    // validation
    this._valuesView.update(this._validate());
  }

  _validate() {
    return this.isValid;
  }
}
