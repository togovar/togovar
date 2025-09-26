import { createEl } from '../../../utils/dom/createEl';
import type { ConditionItemValueView } from '../../../components/ConditionItemValueView';
import type { ConditionTypeValue } from '../../../definition';

export interface ConditionItemView {
  /** 値ビュー（<condition-item-value-view>）のラッパー */
  valuesElement: HTMLDivElement;
  /** この条件アイテムの種別 */
  conditionType: ConditionTypeValue;
}

export interface ConditionValues {
  /** セクションの挿入先（編集 UI を差し込む） */
  sections: HTMLDivElement;
  /** 親の条件アイテムビュー */
  conditionView: ConditionItemView;
}

// 編集画面セクションに付与するクラス名のユニオン
type EditorSectionClassName =
  | 'columns-editor-view' // dataset, consequence, genotype
  | 'frequency-count-editor-view' // dataset, genotype
  | 'clinical-significance-view' // significance
  | 'disease-editor-view' // disease
  | 'text-field-editor-view' // gene, variant id
  | 'location-editor-view' // location
  | 'pathogenicity-editor-view' // pathogenicity
  | 'checkboxes-editor-view'; // variant type

export class ConditionValueEditor {
  protected _sectionEl: HTMLElement | null = null;
  protected _body?: HTMLDivElement | null;
  _conditionType: ConditionTypeValue;

  constructor(
    protected readonly _valuesView: ConditionValues,
    protected readonly _conditionView: ConditionItemView
  ) {
    this._conditionType = _conditionView.conditionType;
  }

  //protected methods
  /** Create an element for the edit screen.
   * @param {"checkboxes-editor-view"|"clinical-significance-view"|"columns-editor-view"|"disease-editor-view"|"frequency-count-editor-view"|"location-editor-view"|"text-field-editor-view"|"pathogenicity-editor-view"} className
   * @param {string} html - \<header>Select [ConditionType]\</header>\<div class="body">\</div> */
  protected _createElement(
    className: EditorSectionClassName,
    html: string
  ): void {
    const sectionEl = createEl('section', {
      class: className,
      dataset: { conditionType: String(this._conditionType) },
      domProps: { innerHTML: html },
    });

    this._valuesView.sections.append(sectionEl);
    this._body = sectionEl.querySelector<HTMLDivElement>(':scope > .body');

    this._sectionEl = sectionEl;
  }

  /** If there is only one value in the condition, update it,
   * for multiple values, add them without duplicates. (for variant id)
   * @protected
   * @param {string} value - The value to add or update.
   * @param {string} label - The label for the value.
   * @param {boolean} isOnly - Whether there is one value in one condition
   * @param {boolean} showDeleteButton - Whether to show the delete button. (for variant id)
   * @returns {HTMLDivElement} - condition-item-value-view element. */
  _addValueView(
    value: string,
    label: string,
    isOnly = false,
    showDeleteButton = false
  ) {
    const selector = isOnly ? '' : `[data-value="${value}"]`;
    let valueView = this._valuesElement.querySelector(
      `condition-item-value-view${selector}`
    );

    if (!valueView) {
      valueView = document.createElement('condition-item-value-view');
      valueView.conditionType = this._conditionType;
      valueView.deleteButton = showDeleteButton;

      this._valuesElement.append(valueView);
    }
    valueView.label = label;
    valueView.value = value;
    return valueView;
  }

  /** Remove all valueViews.
   * @protected */
  _clearValueViews() {
    this._valueViews.forEach((valueView) => {
      valueView.remove();
    });
  }

  /** Remove current valueViews and add lastValueViews. (for variant id)
   * @protected
   * @param {Array<HTMLDivElement>} lastValueViews */
  _updateValueViews(lastValueViews: ConditionItemValueView[]) {
    this._valueViews.forEach((valueView) => {
      valueView.remove();
    });
    this._valuesElement.append(...lastValueViews);
  }

  /** Delete if argument value contains a value
   * @protected
   * @param {string} value */
  _removeValueView(value: string) {
    const selector = value ? `[data-value="${value}"]` : '';
    const valueView = this._valuesElement.querySelector(
      `condition-item-value-view${selector}`
    );
    if (valueView) {
      valueView.remove();
    }
  }

  //accessor

  protected get sectionEl(): HTMLElement {
    if (!this._sectionEl) throw new Error('not mounted yet');
    return this._sectionEl;
  }

  // div.values which is a wrapper for condition-item-value-view
  protected get _valuesElement(): HTMLDivElement {
    return this._valuesView.conditionView.valuesElement;
  }

  /** [condition-item-value-view]
   * @type {Array<HTMLDivElement>} */
  protected get _valueViews(): ConditionItemValueView[] {
    return Array.from(
      this._valuesElement.querySelectorAll<ConditionItemValueView>(
        ':scope > condition-item-value-view'
      )
    );
  }
}
