import StoreManager from './StoreManager.js';
import CollapseView from './CollapseView.js';
import RangeSelectorView from "./RangeSelectorView.js";

export default class AdvancedSearchDatasetsView {

  constructor(elm) {

    this.kind = 'adv_frequency';

    // generate
    this._conditionMaster = StoreManager.getSearchConditionMaster('adv_frequency');
    const tbody = elm.querySelector(':scope > .tablecontainer > table > tbody');
    tbody.innerHTML = `
    ${this._conditionMaster.items.map(item => {
      return `
      <tr>
        <td>
          <div class="dataset">
            <label class="label">
              <div class="dataset-icon" data-dataset="${item.id}">
                <div class="properties"></div>
              </div>
            </label>
          </div>
        </td>
        <td>
          <div class="datasetlabel">
            <p>${item.label}</p>
          </div>
        </td>
        <td>
          <div class="frequencyandcount">
            <div class="range-selector-view" data-dataset="${item.id}"></div>
          </div>
        </td>
        <td>
          <input class="exclude" type="checkbox" value="exclude" data-dataset="${item.id}">
        </td>
      </tr>`;
    }).join('')}`;
    const conditions = this._getConditionsFromStore();
    this._filteredInputs = {};
    tbody.querySelectorAll('input.exclude[type="checkbox"]').forEach(input => this._filteredInputs[input.dataset.dataset] = input);
    this._rangeSelectorViews = {};
    tbody.querySelectorAll('.range-selector-view').forEach(elm => {
      this._rangeSelectorViews[elm.dataset.dataset] = new RangeSelectorView(elm, this, 0, 1, 'horizontal', 'advanced');
    });
    this._update(conditions);

    // events
    StoreManager.bind('advancedSearchConditions', this);
    // event: filter
    tbody.querySelectorAll(':scope > tr > td:nth-child(4) > input[type="checkbox"]').forEach(elm => {
      elm.addEventListener('change', e => this.changeParameter({filtered: e.target.checked}, e.target.dataset.dataset) );
    });

    // collapse
    elm.querySelectorAll('.collapse-view').forEach(elm => {
      new CollapseView(elm);
    });
  }

  changeParameter(newCondition, dataset) {
    const condition = this._getConditionsFromStore();
    for (const key in newCondition) {
      condition[dataset][key] = newCondition[key];
    }
    StoreManager.setAdvancedSearchCondition('adv_frequency', condition);
  }

  advancedSearchConditions(conditions) {
    const condition = conditions['adv_frequency'];
    if (condition === undefined) return;
    // reflect changes in the slider
    this._update(condition);
  }

  _update(conditions) {
    for (const dataset in this._rangeSelectorViews) {
      this._rangeSelectorViews[dataset].updateGUIWithCondition(conditions[dataset]);
      this._filteredInputs[dataset].checked = conditions[dataset].filtered === '1' || conditions[dataset].filtered === true;
    }
  }

  _getConditionsFromStore() {
    let condition = StoreManager.getAdvancedSearchCondition(this.kind);
    // if the condition is undefined, generate it from master
    condition = condition ? condition : this._conditionMaster.items.reduce((acc, item) => Object.assign(acc, {[item.id]: item.default}), {});
    // if each items of the condition are not defined, generate them from master
    for (const item of this._conditionMaster.items) {
      condition[item.id] = condition[item.id] ? condition[item.id] : this._conditionMaster.items.find(frequency => frequency.id === item.id).default;
    }
    return condition;
  }

}