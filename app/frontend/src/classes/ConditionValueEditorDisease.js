import ConditionValueEditor from './ConditionValueEditor.js';

import { ConditionDiseaseSearch } from '../components/ConditionDiseaseSearch/ConditionDiseaseSearch.js';

export default class ConditionValueEditorDisease extends ConditionValueEditor {
  /**
   * @param {ConditionValues} valuesView
   * @param {ConditionItemView} conditionView */
  constructor(valuesView, conditionView) {
    super(valuesView, conditionView);

    this._data = { id: null, label: null };

    // HTML
    this._createElement(
      'disease-editor-view',
      `
    <header>Select ${this._conditionType}</header>
    <div class="body"></div>
    `
    );

    this._el.classList.add('text-field-editor-view');

    this._conditionElem =
      this._body.querySelector('condition-disease-search') ||
      new ConditionDiseaseSearch(this._body);

    this._conditionElem.addEventListener('disease-selected', (e) => {
      e.stopPropagation();
      const { id, label } = e.detail;

      if (id) {
        this._data = { id, label };

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
