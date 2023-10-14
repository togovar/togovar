import ConditionValueEditor from './ConditionValueEditor.js';
import SearchFieldWithSuggestions from '../components/Common/SearchField/SearchFieldWithSuggestions.js';
import SearchFieldSimple from '../components/Common/SearchField/SearchFieldOnly.js';

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

      /** Add condition-item-value-view with selected suggestion data */
      const handleSuggestSelect = (e) => {
        const value = e.detail.id;
        const label = e.detail.label;

        this._addValueView(value, label, true, false);

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
            this._addValueView(id, id, false, true);
            this._update();

            this._searchFieldView.value = '';
          }
        }
      });
    }
  }

  // public methods

  keepLastValues() {
    this._lastValue = this._searchFieldView.term || '';
  }

  restore() {
    this._searchFieldView.setTerm(this._lastValue);
    this._update();
  }

  search() {
    this._update();
  }

  get isValid() {
    /** Valid only if there are some condition-item-value-view 's in the valuesView */
    return this._valueViews.length > 0;
  }

  // private methods

  /** Update is OK button is disabled on not */
  _update() {
    // validation
    this._valuesView.update(this._validate());
  }

  _validate() {
    return this.isValid;
  }
}
