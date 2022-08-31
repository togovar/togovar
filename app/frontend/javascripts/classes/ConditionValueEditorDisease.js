import ConditionValueEditor from './ConditionValueEditor.js';

import { ConditionDiseaseSearch } from '../components/ConditionDiseaseSearch/ConditionDiseaseSearch.js';

export default class ConditionValueEditorDisease extends ConditionValueEditor {
  constructor(valuesView, conditionType) {
    super(valuesView, conditionType);

    this._data = { id: null, label: null };

    // HTML
    this._createElement(
      'disease-editor-view',
      `
    <header>Select ${conditionType}</header>
    <div class="body"></div>
    `
    );

    this._conditionElem =
      this._body.querySelector('condition-disease-search') ||
      new ConditionDiseaseSearch(this._body);

    this._conditionElem.addEventListener('disease-selected', (e) => {
      e.stopPropagation();
      const { cui, label } = e.detail;

      // if no cui in the data, do not add it to search conditions
      if (cui) {
        this._data = { id: cui, label };

        this._addValueView(this._data.id, this._data.label, true);

        this._update();
      } else {
        this._removeValueView(this._data.id);
        this._data = { id: null, label: null };
        this._update();
      }
    });
  }

  get isValid() {
    return !!this._data.id;
  }

  keepLastValues() {
    this._lastValues = { ...this._data };
  }

  restore() {
    this._data.id = { ...this._lastValues };
    this._update();
  }

  _validate() {
    return this.isValid;
  }

  _update() {
    this._valuesView.update(this._validate());
  }
}
