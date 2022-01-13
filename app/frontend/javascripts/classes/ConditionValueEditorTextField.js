import ConditionValueEditor from "./ConditionValueEditor.js";
import SearchFieldView from './SearchFieldView.js';
import {CONDITION_TYPE} from '../definition.js';

export default class ConditionValueEditorTextField extends ConditionValueEditor {

  constructor(valuesView, conditionType) {

    super(valuesView, conditionType);

    // HTML
    this._createElement('text-field-editor-view', `
    <header>Select ${conditionType}</header>
    <div class="body"></div>`);
    this._searchFieldView = new SearchFieldView(
      this,
      this._body,
      {
        [CONDITION_TYPE.gene_symbol]: 'Search for gene symbol',
        [CONDITION_TYPE.disease]: 'Search for disease',
      }[conditionType],
      [{
        [CONDITION_TYPE.gene_symbol]: 'gene',
        [CONDITION_TYPE.disease]: 'disease',
      }[conditionType]]
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
    const term = this._searchFieldView.value;
    // this._valuesEl.innerHTML = `<span class="value" data-value="${term}">${term}</span>`;
    this._addValueView(term, term, true);

    // validation
    this._valuesView.update(this._validate());
  }

  _validate() {
    return this.isValid;
  }

}
