import { createEl } from '../../../utils/dom/createEl';
import { ConditionValueEditor } from './ConditionValueEditor';
import { ADVANCED_CONDITIONS } from '../../../global';
import type ConditionValues from '../ConditionValues.js';
import type { ConditionItemView } from '../ConditionItemView';
import type { ConditionItemValueView } from '../../../components/ConditionItemValueView';
import type { SignificanceSource } from '../../../types';

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

const SEL = {
  mgend:
    ':scope > .mgend-wrapper > .mgend-condition-wrapper > condition-item-value-view',
  clinvar:
    ':scope > .clinvar-wrapper > .clinvar-condition-wrapper > condition-item-value-view',
} as const;

/** for clinical significance */
export class ConditionValueEditorClinicalSignificance extends ConditionValueEditor {
  _checkboxes: Array<HTMLInputElement>;
  _values: DatasetValues;
  _lastValues: DatasetValues;

  constructor(valuesView: ConditionValues, conditionView: ConditionItemView) {
    super(valuesView, conditionView);

    // HTML
    const dataset: Dataset = ADVANCED_CONDITIONS[this._conditionType];

    this._createElement('clinical-significance-view', () => [
      createEl('header', { text: `Select ${this._conditionType}` }),
      createEl('div', {
        class: 'buttons',
        children: [
          createEl('button', {
            class: ['button-view', '-weak'],
            text: 'Select all',
          }),
          createEl('button', {
            class: ['button-view', '-weak'],
            text: 'Clear all',
          }),
        ],
      }),
      createEl('div', { class: ['dataset-title', 'mgend'], text: 'MGeND' }),
      createEl('ul', {
        class: ['checkboxes', 'body'],
        dataset: { type: 'clinical-significance', source: 'mgend' },
      }),
      createEl('hr'),
      createEl('div', { class: ['dataset-title', 'clinvar'], text: 'Clinvar' }),
      createEl('ul', {
        class: ['checkboxes', 'body'],
        dataset: { type: 'clinical-significance', source: 'clinvar' },
      }),
    ]);

    this._values = { mgend: [], clinvar: [] };
    this._lastValues = { mgend: [], clinvar: [] };

    // UL を取得
    const mgendUl = this.sectionEl.querySelector<HTMLUListElement>(
      ':scope > ul[data-source="mgend"]'
    )!;
    const clinvarUl = this.sectionEl.querySelector<HTMLUListElement>(
      ':scope > ul[data-source="clinvar"]'
    )!;

    const mgendVals = this._filterValues(dataset.values.mgend, 'mgend');
    const clinvarVals = this._filterValues(dataset.values.clinvar, 'clinvar');

    // LI を生成して挿入
    mgendUl.append(...this._generateCheckboxListNodes(mgendVals, 'mgend'));
    clinvarUl.append(
      ...this._generateCheckboxListNodes(clinvarVals, 'clinvar')
    );

    // references
    // 参照を取る（LI を挿入した後で）
    this._checkboxes = Array.from(
      this.sectionEl.querySelectorAll<HTMLInputElement>(
        ':scope > ul > li > label > input[type="checkbox"]'
      )
    );

    // attach events
    this._attachCheckboxEvents();
    this._attachButtonEvents();
  }

  private _generateCheckboxListNodes(
    values: Array<{ value: string; label: string }>,
    source: SignificanceSource
  ): HTMLLIElement[] {
    return values.map(({ value, label }) =>
      createEl('li', {
        dataset: { value, source },
        children: [
          createEl('label', {
            children: [
              createEl('input', {
                attrs: { type: 'checkbox' },
                dataset: { source, label },
                domProps: { value },
              }),
              createEl('span', {
                class: 'clinical-significance',
                dataset: { value },
              }),
              ' ',
              label,
            ],
          }),
        ],
      })
    );
  }

  _attachCheckboxEvents() {
    this._checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        this._update();
      });
    });
  }

  /** "Select all" と "Clear all" ボタンにクリックイベントを追加し、
   * ボタンがクリックされた際にチェックボックスの状態を一括変更する。 */
  _attachButtonEvents() {
    this.sectionEl
      .querySelectorAll(':scope > .buttons > button')
      .forEach((button, index) => {
        button.addEventListener('click', () => {
          this._checkboxes.forEach((checkbox) => (checkbox.checked = !index));
          this._update();
        });
      });
  }

  private _filterValues(
    values: Array<{ value: string; label: string }>,
    source: SignificanceSource
  ) {
    // 例）significance のとき ClinVar から NC を除外
    if (this._conditionType === 'significance' && source === 'clinvar') {
      return values.filter((v) => v.value !== 'NC');
    }
    return values;
  }

  // public methods
  keepLastValues() {
    const valueMgendElements = Array.from(
      this._valuesElement.querySelectorAll(SEL.mgend)
    ) as ConditionItemValueView[];
    const valueClinvarElements = Array.from(
      this._valuesElement.querySelectorAll(SEL.clinvar)
    ) as ConditionItemValueView[];

    this._lastValues = {
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
    this._checkboxes.forEach((checkbox) => {
      // チェックボックスのデータソースに応じて、対応する配列で値を探す
      const valuesArray =
        checkbox.dataset.source === 'mgend'
          ? this._lastValues.mgend
          : this._lastValues.clinvar;

      const datasetValue = valuesArray.find((value) => {
        return value.value === checkbox.value;
      });

      // チェックボックスの状態を過去の値に基づいて復元
      checkbox.checked = !!datasetValue; // 値が見つかった場合はチェックを入れる
    });
    this._update();
  }

  // private methods
  /** チェックボックスの状態に基づいて、値の更新、重複のチェック、ラベルや要素の削除を行う
   * また、更新された値に基づいて Clinical Significance のビューを更新 */
  _update() {
    // update values
    this._checkboxes.forEach((checkbox) => {
      const newValue = {
        value: checkbox.value,
        label: checkbox.dataset.label,
      };

      if (checkbox.checked) {
        // Add new value if not already exists
        this._addUniqueValue(
          checkbox.dataset.source as SignificanceSource,
          newValue
        );
      } else {
        // Remove value when unchecked
        this._removeValue(
          checkbox.dataset.source as SignificanceSource,
          checkbox.value,
          checkbox.dataset.label
        );
      }
    });

    // Update Clinical Significance View
    this._updateClinicalSignificanceValueView();

    // validation
    this._valuesView.update(this._validate());
  }

  /** MGeNDまたはClinVarの配列に値を一意に追加 */
  _addUniqueValue(
    source: SignificanceSource,
    newValue: { value: string; label: string }
  ) {
    const values =
      source === 'mgend' ? this._values.mgend : this._values.clinvar;
    const exists = values.some(
      (item) => item.value === newValue.value && item.label === newValue.label
    );

    if (!exists) {
      values.push(newValue); // 重複していなければ追加
    }
  }

  /** 指定されたソースの配列から該当の値を削除
   * また、すべての値が削除された場合は、関連するラベルと要素も削除 */
  private _removeValue(
    source: SignificanceSource,
    value: string,
    label: string
  ) {
    const values =
      source === 'mgend' ? this._values.mgend : this._values.clinvar;
    const index = values.findIndex(
      (item) => item.value === value && item.label === label
    );

    if (index !== -1) {
      values.splice(index, 1); // 一致する要素を削除
    }

    if (values.length === 0) {
      this._removeConditionWrapper(source); // 値が全てなくなった場合の処理
    }
  }

  /** 指定されたソースに関連する要素（spanやcondition-wrapper）を削除 */
  private _removeConditionWrapper(source: SignificanceSource) {
    const span = this._valuesElement.querySelector(`span.${source}`);
    const wrapper = this._valuesElement.querySelector(
      `.${source}-condition-wrapper`
    );

    if (span) span.remove();
    if (wrapper) wrapper.remove();
  }

  /** Clinical Significance のビューを更新し、ラベルと対応する値を表示します。
   * 新しいラベルや条件が追加される場合、既存のものを削除してから再描画します。 */
  private _updateClinicalSignificanceValueView() {
    if (this._values.mgend.length > 0) {
      this._ensureWrapperExists('mgend');
    }
    if (this._values.clinvar.length > 0) {
      this._ensureWrapperExists('clinvar');
    }

    this._updateConditionViews('mgend', this._values.mgend);
    this._updateConditionViews('clinvar', this._values.clinvar);
  }

  /** 指定されたデータソースに対応するラベルや条件を描画
   * 既存のビューがある場合は削除してから、新しい条件ビューを追加 */
  private _updateConditionViews(
    source: SignificanceSource,
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
      ) as ConditionItemValueView;
      valueView.conditionType = this._conditionType;
      valueView.label = value.label;
      valueView.value = value.value;

      wrapper.append(valueView);
    });
  }

  /** 指定されたデータソースに対応するラベルとコンディションのラッパー要素が存在しない場合、作成して追加 */
  private _ensureWrapperExists(source: SignificanceSource) {
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

  _validate() {
    return this.isValid;
  }

  //accessor
  /** You can press the ok button if there are two valid values */
  get isValid() {
    return this._checkboxes.some((checkbox) => checkbox.checked);
  }
}
