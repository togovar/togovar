// TODO: 10/20 MGeNDが加わるため、下記の処理を確認する必要がある

import ConditionValueEditor from './ConditionValueEditor.js';
import { ADVANCED_CONDITIONS } from '../global.js';
import ConditionValues from './ConditionValues.js';
import ConditionItemView from './ConditionItemView.js';

type DatasetValue = {
  value: string;
  label: string;
};

type Dataset = {
  label: string;
  type: string;
  values: Record<'clinvar' | 'mgend', DatasetValue[]>;
};

/** for clinical significance */
export default class ConditionValueEditorClinicalSignificance extends ConditionValueEditor {
  _checkboxes: Array<HTMLInputElement>;
  _lastValues: Array<string>;

  /**
   * @param {ConditionValues} valuesView
   * @param {ConditionItemView} conditionView */
  constructor(valuesView: ConditionValues, conditionView: ConditionItemView) {
    super(valuesView, conditionView);

    // HTML
    const dataset: Dataset = ADVANCED_CONDITIONS[this._conditionType];

    this._createElement(
      'clinical-significance-view',
      `
    <header>Select ${this._conditionType}</header>
    <div class="buttons">
      <button class="button-view -weak">Select all</button>
      <button class="button-view -weak">Clear all</button>
    </div>

    <div class="dataset-title">Clinvar</div>
    <ul class="checkboxes body">
      ${dataset.values.clinvar
        .map(
          (value) => `
      <li data-value="${value.value}" data-source="clinvar">
        <label>
        <input
          type="checkbox"
          value="${value.value}"
          data-label="${value.label}">
            ${`<span class="clinical-significance" data-value="${value.value}"></span>`}
            ${value.label}
        </label>
      </li>`
        )
        .join('')}
    </ul>

    <hr/>

    <div class="dataset-title">MGeND</div>
    <ul class="checkboxes body">
      ${dataset.values.mgend
        .map(
          (value) => `
      <li data-value="${value.value}" data-source="mgend">
        <label>
        <input
          type="checkbox"
          value="${value.value}"
          data-label="${value.label}">
            ${`<span class="clinical-significance" data-value="${value.value}"></span>`}
            ${value.label}
        </label>
      </li>`
        )
        .join('')}
    </ul>
    `
    );

    // delete 'not in clinver'
    if (this._conditionType === 'significance') {
      this._el.querySelector('li[data-value="NC"]').remove();
    }

    // references
    this._checkboxes = Array.from(
      this._el.querySelectorAll(':scope > ul > li > label > input')
    );

    // attach events
    this._checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        this._update();
      });
    });
    this._el
      .querySelectorAll(':scope > .buttons > button')
      .forEach((button, index) => {
        button.addEventListener('click', () => {
          this._checkboxes.forEach((checkbox) => (checkbox.checked = !index));
          this._update();
        });
      });
  }

  // public methods

  // TODO: 10/20 MGeNDが加わるため、下記の処理を変更する必要がある

  keepLastValues() {
    // this._lastValues = Array.from(
    //   this._valuesView.conditionView.valuesElement.querySelectorAll(
    //     ':scope > condition-item-value-view'
    //   )
    // ).map((value) => value.value);

    // this._lastValues = Array.from(
    //   this._valuesView.conditionView.valuesElement.querySelectorAll(
    //     ':scope > condition-item-value-view'
    //   )
    // ).map((value) => value.values);

    console.log(this._lastValues);
  }

  restore() {
    this._checkboxes.forEach((checkbox) => {
      const value = this._lastValues.find((value) => value === checkbox.value);
      checkbox.checked = value !== undefined;
    });
    this._update();
  }

  get isValid() {
    return this._checkboxes.some((checkbox) => checkbox.checked);
  }

  // private methods

  _update() {
    // update values
    this._checkboxes.forEach((checkbox) => {
      if (checkbox.checked) {
        this._addValueView(checkbox.value, checkbox.dataset.label);
      } else {
        this._removeValueView(checkbox.value);
      }
    });

    // validation
    this._valuesView.update(this._validate());
  }

  _validate() {
    return this.isValid;
  }
}
