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

}