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
    console.log(value, label, isOnly);
    let valueView;
    // find value view
    if (isOnly) {
      valueView = this._valuesEl.querySelector('.value');
      if (valueView) {
        valueView.dataset.value = value;
        valueView.querySelector('.inner').textContent = label;
      }
    } else {
      valueView = this._valuesEl.querySelector(`.value[data-value="${value}"]`);
    }
    // if no view is found, create a new one
    if (!valueView) {
      valueView = document.createElement('span');
      valueView.classList.add('value', 'condition-item-value-view');
      valueView.dataset.value = value;
      valueView.dataset.conditionType = this._conditionType;
      valueView.innerHTML = `<span class="inner">${label}</span>`;
      this._valuesEl.append(valueView);
    }
    return valueView;
  }

  _removeValueView(value) {
    const valueView = this._valuesEl.querySelector(`.value[data-value="${value}"]`);
    if (valueView) {
      valueView.remove();
    }
  }

  get _valuesEl() {
    return this._valuesView.conditionView.valuesElement;
  }

  get _valueViews() {
    const valueViews = Array.from(this._valuesEl.querySelectorAll(':scope > .value'));
    return valueViews;
  }

}