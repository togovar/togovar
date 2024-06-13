/** The core of advanced search conditions.
 * Superclass of
 * {@link ConditionValueEditorCheckboxes},
 * {@link ConditionValueEditorColumns},
 * {@link ConditionValueEditorDisease}
 * {@link ConditionValueEditorFrequencyCount},
 * {@link ConditionValueEditorGene},
 * {@link ConditionValueEditorLocation},
 * {@link ConditionValueEditorVariantID},
 */
class ConditionValueEditor {
  /**
   * @param {ConditionValues} valuesView
   * @param {ConditionItemView} conditionView */
  constructor(valuesView, conditionView) {
    /** @property {ConditionValues} valuesView */
    this._valuesView = valuesView;
    /** @property {ConditionItemView} conditionView */
    this._conditionView = conditionView;
    /** @property {string} conditionType */
    this._conditionType = conditionView.conditionType;
  }

  //protected methods
  /** Create an element for the edit screen.
   * @protected
   * @param {"checkboxes-editor-view"|"columns-editor-view"|"disease-editor-view"|"frequency-count-editor-view"|"location-editor-view"|"text-field-editor-view"} className
   * @param {string} html - \<header>Select [ConditionType]\</header>\<div class="body">\</div> */
  _createElement(className, html) {
    this._el = document.createElement('section');
    this._el.classList.add(className);
    this._el.dataset.conditionType = this._conditionType;
    this._el.innerHTML = html;
    this._valuesView.sections.append(this._el);
    this._body = this._el.querySelector(':scope > .body');
  }

  /** If there is only one value in the condition, update it,
   * for multiple values, add them without duplicates. (for variant id)
   * @protected
   * @param {string} value - The value to add or update.
   * @param {string} label - The label for the value.
   * @param {boolean} isOnly - Whether there is one value in one condition
   * @param {boolean} showDeleteButton - Whether to show the delete button. (for variant id)
   * @returns {HTMLDivElement} - condition-item-value-view element. */
  _addValueView(value, label, isOnly = false, showDeleteButton = false) {
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
  _updateValueViews(lastValueViews) {
    this._valueViews.forEach((valueView) => {
      valueView.remove();
    });
    this._valuesElement.append(...lastValueViews);
  }

  /** Delete if argument value contains a value
   * @protected
   * @param {string} value */
  _removeValueView(value) {
    const selector = value ? `[data-value="${value}"]` : '';
    const valueView = this._valuesElement.querySelector(
      `condition-item-value-view${selector}`
    );
    if (valueView) {
      valueView.remove();
    }
  }

  //accessor
  /** div.values which is a wrapper for condition-item-value-view
   * @protected
   * @type {HTMLDivElement} */
  get _valuesElement() {
    return this._valuesView.conditionView.valuesElement;
  }

  /** [condition-item-value-view]
   * @protected
   * @type {Array<HTMLDivElement>} */
  get _valueViews() {
    const valueViews = Array.from(
      this._valuesElement.querySelectorAll(':scope > condition-item-value-view')
    );
    return valueViews;
  }
}

export default ConditionValueEditor;
