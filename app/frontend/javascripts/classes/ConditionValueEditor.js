// import ConditionItemValueView from '../components/ConditionItemValueView';

export default class ConditionValueEditor {
  constructor(valuesView, conditionType) {
    this._valuesView = valuesView;
    this._conditionType = conditionType;
  }

  _createElement(className, html) {
    this._el = document.createElement('section');
    this._el.classList.add(className);
    this._el.dataset.conditionType = this._conditionType;
    this._el.innerHTML = html;
    this._valuesView.sections.append(this._el);
    this._body = this._el.querySelector(':scope > .body');
  }

  /**
   *
   * @param {string} value
   * @param {string} label
   * @param {boolean} isOnly
   */
  _addValueView(value, label, isOnly = false) {
    // find value view
    const selector = isOnly ? '' : `[data-value="${value}"]`;
    let valueView = this._valuesElement.querySelector(
      `condition-item-value-view${selector}`
    );
    // if no view is found, create a new one
    if (!valueView) {
      valueView = document.createElement('condition-item-value-view');
      valueView.conditionType = this._conditionType;
      this._valuesElement.append(valueView);
    }
    valueView.label = label;
    valueView.value = value;
    return valueView;
  }

  /**
   *
   * @param {string} value
   */
  _removeValueView(value) {
    const selector = value ? `[data-value="${value}"]` : '';
    const valueView = this._valuesElement.querySelector(
      `condition-item-value-view${selector}`
    );
    if (valueView) {
      valueView.remove();
    }
  }

  get _valuesElement() {
    return this._valuesView.conditionView.valuesElement;
  }

  get _valueViews() {
    const valueViews = Array.from(
      this._valuesElement.querySelectorAll(':scope > condition-item-value-view')
    );
    return valueViews;
  }
}
