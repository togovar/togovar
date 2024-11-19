import ConditionValueEditor from './ConditionValueEditor.js';
import { ADVANCED_CONDITIONS } from '../global.js';
import ConditionValues from './ConditionValues.js';
import ConditionItemView from './ConditionItemView.js';

type DatasetSource = 'clinvar' | 'mgend';

type DatasetValue = {
  value: string;
  label: string;
};

type Dataset = {
  label: string;
  type: string;
  values: Record<'clinvar' | 'mgend', DatasetValue[]>;
};

interface DatasetValues {
  mgend: DatasetValue[];
  clinvar: DatasetValue[];
}

interface ConditionItemValueViewElement extends HTMLElement {
  label: string;
  conditionType: string;
  value: string;
  deleteButton?: boolean;
}

/** for clinical significance */
export default class ConditionValueEditorClinicalSignificance extends ConditionValueEditor {
  #checkboxes: Array<HTMLInputElement>;
  #values: DatasetValues;
  #lastValues: DatasetValues;

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

    <div class="dataset-title mgend">MGeND</div>
    <ul class="checkboxes body" data-type="clinical-significance">
      ${this.#generateCheckboxList(dataset.values.mgend, 'mgend')}
    </ul>
    
    <hr/>

    <div class="dataset-title clinvar">Clinvar</div>
    <ul class="checkboxes body" data-type="clinical-significance">
      ${this.#generateCheckboxList(dataset.values.clinvar, 'clinvar')}
    </ul>
    `
    );

    this.#values = { mgend: [], clinvar: [] };
    this.#lastValues = { mgend: [], clinvar: [] };

    // delete 'not in clinver'
    if (this._conditionType === 'significance') {
      this._el.querySelector('li[data-value="NC"]').remove();
    }

    // references
    this.#checkboxes = Array.from(
      this._el.querySelectorAll(':scope > ul > li > label > input')
    );

    // attach events
    this.#attachCheckboxEvents();
    this.#attachButtonEvents();
  }

  #generateCheckboxList(
    values: Array<{ value: string; label: string }>,
    source: string
  ): string {
    return values
      .map(
        (value) => `
        <li data-value="${value.value}" data-source="${source}">
          <label>
          <input
            type="checkbox"
            value="${value.value}"
            data-source="${source}"
            data-label="${value.label}">
              <span class="clinical-significance" data-value="${value.value}"></span>
              ${value.label}
          </label>
        </li>`
      )
      .join('');
  }

  #attachCheckboxEvents() {
    this.#checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        this.#update();
      });
    });
  }

  /** "Select all" と "Clear all" ボタンにクリックイベントを追加し、
   * ボタンがクリックされた際にチェックボックスの状態を一括変更する。 */
  #attachButtonEvents() {
    this._el
      .querySelectorAll(':scope > .buttons > button')
      .forEach((button, index) => {
        button.addEventListener('click', () => {
          this.#checkboxes.forEach((checkbox) => (checkbox.checked = !index));
          this.#update();
        });
      });
  }

  // public methods
  keepLastValues() {
    const valueMgendElements = Array.from(
      this._valuesElement.querySelectorAll(
        ':scope > .mgend-wrapper > .mgend-condition-wrapper > condition-item-value-view'
      )
    ) as ConditionItemValueViewElement[];
    const valueClinvarElements = Array.from(
      this._valuesElement.querySelectorAll(
        ':scope > .clinvar-wrapper > .clinvar-condition-wrapper > condition-item-value-view'
      )
    ) as ConditionItemValueViewElement[];

    this.#lastValues = {
      mgend: valueMgendElements.map((value) => ({
        value: value.value,
        label: value.label,
      })),
      clinvar: valueClinvarElements.map((value) => ({
        value: value.value,
        label: value.label,
      })),
    };
  }

  restore() {
    this.#checkboxes.forEach((checkbox) => {
      // チェックボックスのデータソースに応じて、対応する配列で値を探す
      const valuesArray =
        checkbox.dataset.source === 'mgend'
          ? this.#lastValues.mgend
          : this.#lastValues.clinvar;

      const datasetValue = valuesArray.find((value) => {
        return value.value === checkbox.value;
      });

      // チェックボックスの状態を過去の値に基づいて復元
      checkbox.checked = !!datasetValue; // 値が見つかった場合はチェックを入れる
    });
    this.#update();
  }

  // private methods
  /** チェックボックスの状態に基づいて、値の更新、重複のチェック、ラベルや要素の削除を行う
   * また、更新された値に基づいて Clinical Significance のビューを更新 */
  #update() {
    // update values
    this.#checkboxes.forEach((checkbox) => {
      const newValue = {
        value: checkbox.value,
        label: checkbox.dataset.label,
      };

      if (checkbox.checked) {
        // Add new value if not already exists
        this.#addUniqueValue(
          checkbox.dataset.source as DatasetSource,
          newValue
        );
      } else {
        // Remove value when unchecked
        this.#removeValue(
          checkbox.dataset.source as DatasetSource,
          checkbox.value,
          checkbox.dataset.label
        );
      }
    });

    // Update Clinical Significance View
    this.#updateClinicalSignificanceValueView();

    // validation
    this._valuesView.update(this.#validate());
  }

  /** MGeNDまたはClinVarの配列に値を一意に追加 */
  #addUniqueValue(
    source: DatasetSource,
    newValue: { value: string; label: string }
  ) {
    const values =
      source === 'mgend' ? this.#values.mgend : this.#values.clinvar;
    const exists = values.some(
      (item) => item.value === newValue.value && item.label === newValue.label
    );

    if (!exists) {
      values.push(newValue); // 重複していなければ追加
    }
  }

  /** 指定されたソースの配列から該当の値を削除
   * また、すべての値が削除された場合は、関連するラベルと要素も削除 */
  #removeValue(source: DatasetSource, value: string, label: string) {
    const values =
      source === 'mgend' ? this.#values.mgend : this.#values.clinvar;
    const index = values.findIndex(
      (item) => item.value === value && item.label === label
    );

    if (index !== -1) {
      values.splice(index, 1); // 一致する要素を削除
    }

    if (values.length === 0) {
      this.#removeConditionWrapper(source); // 値が全てなくなった場合の処理
    }
  }

  /** 指定されたソースに関連する要素（spanやcondition-wrapper）を削除 */
  #removeConditionWrapper(source: DatasetSource) {
    const span = this._valuesElement.querySelector(`span.${source}`);
    const wrapper = this._valuesElement.querySelector(
      `.${source}-condition-wrapper`
    );

    if (span) span.remove();
    if (wrapper) wrapper.remove();
  }

  /** Clinical Significance のビューを更新し、ラベルと対応する値を表示します。
   * 新しいラベルや条件が追加される場合、既存のものを削除してから再描画します。 */
  #updateClinicalSignificanceValueView() {
    if (this.#values.mgend.length > 0) {
      this.#ensureWrapperExists('mgend');
    }
    if (this.#values.clinvar.length > 0) {
      this.#ensureWrapperExists('clinvar');
    }

    this.#updateConditionViews('mgend', this.#values.mgend);
    this.#updateConditionViews('clinvar', this.#values.clinvar);
  }

  /** 指定されたデータソースに対応するラベルや条件を描画
   * 既存のビューがある場合は削除してから、新しい条件ビューを追加 */
  #updateConditionViews(
    source: DatasetSource,
    values: Array<{ value: string; label: string }>
  ) {
    const wrapper = this._valuesElement.querySelector(
      `.${source}-condition-wrapper`
    );

    // 既存のビューを削除
    if (wrapper) {
      wrapper
        .querySelectorAll('condition-item-value-view')
        .forEach((view) => view.remove());
    }

    // 新しい値を描画
    values.forEach((value) => {
      const valueView = document.createElement(
        'condition-item-value-view'
      ) as ConditionItemValueViewElement;
      valueView.conditionType = this._conditionType;
      valueView.label = value.label;
      valueView.value = value.value;

      wrapper.append(valueView);
    });
  }

  /** 指定されたデータソースに対応するラベルとコンディションのラッパー要素が存在しない場合、作成して追加 */
  #ensureWrapperExists(source: DatasetSource) {
    const wrapperClass = `${source}-wrapper`;
    const conditionWrapperClass = `${source}-condition-wrapper`;

    if (!this._valuesElement.querySelector(`.${wrapperClass}`)) {
      const wrapper = document.createElement('div');
      wrapper.classList.add(wrapperClass);
      this._valuesElement.append(wrapper);
    }

    if (!this._valuesElement.querySelector(`.${conditionWrapperClass}`)) {
      const span = document.createElement('span');
      span.classList.add(source);
      span.textContent = source === 'mgend' ? 'MGeND' : 'ClinVar';

      const conditionWrapper = document.createElement('div');
      conditionWrapper.classList.add(conditionWrapperClass);

      this._valuesElement
        .querySelector(`.${wrapperClass}`)
        .append(span, conditionWrapper);
    }
  }

  #validate() {
    return this.isValid;
  }

  //accessor
  /** You can press the ok button if there are two valid values */
  get isValid() {
    return this.#checkboxes.some((checkbox) => checkbox.checked);
  }
}
