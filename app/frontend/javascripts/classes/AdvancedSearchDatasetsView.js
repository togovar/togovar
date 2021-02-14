import StoreManager from './StoreManager.js';
import CollapseView from './CollapseView.js';
import RangeSelectorView from "./RangeSelectorView.js";

export default class AdvancedSearchDatasetsView {

  constructor(elm) {
    // generate
    console.log(elm)
    this._conditionMaster = StoreManager.getSearchConditionMaster('adv_frequency');
    console.log(this._conditionMaster)
    const tbody = elm.querySelector(':scope > .tablecontainer > table > tbody');
    tbody.innerHTML = `
    ${this._conditionMaster.items.map(item => {
      return `
      <tr>
        <td>
          <div class="dataset">
            <label class="label">
              <input type="checkbox" value="">
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
          <div class="variantcallingquality">
            <input type="checkbox" value="">
          </div>
        </td>
      </tr>`;
    }).join('')}`;
    this._rangeSelectorViews = tbody.querySelectorAll('.range-selector-view');
    this._rangeSelectorViews.forEach((elm, index) => {
      new RangeSelectorView(elm, this, 0, 1, 'horizontal', 'advanced');
    });

    // events
    StoreManager.bind('advancedSearchConditions', this);

    // collapse
    elm.querySelectorAll('.collapse-view').forEach(elm => {
      new CollapseView(elm);
    });
  }

  changeParameter(newCondition, target) {
    const condition = this._getConditionFromStore();
    Object.keys(newCondition).forEach(key => {
      switch (key) {
        case 'from':
          condition[target.elm.dataset.dataset].frequency.gte = newCondition[key];
          break;
        case 'to':
          condition[target.elm.dataset.dataset].frequency.lte = newCondition[key];
          break;
        case 'invert':
          //condition[target.elm.dataset.dataset].frequency.gte = newCondition[key];
          break;
      }
    });
    console.log(condition)
    StoreManager.setAdvancedSearchCondition('adv_frequency', condition);
  }

  advancedSearchConditions(conditions) {
    console.log(conditions)
    const condition = conditions['adv_frequency'];
    if (condition === undefined) return;
    this._rangeSelectorView.updateGUIWithCondition(condition);
  }

  _getConditionFromStore() {
    let condition = StoreManager.getSearchCondition(this.kind);
    // if the condition is undefined, generate it from master
    condition = condition ? condition : this._conditionMaster.items.reduce((acc, item) => Object.assign(acc, {[item.id]: item.default}), {});
    // if each items of the condition are not defined, generate them from master
    for (const item of this._conditionMaster.items) {
      condition[item.id] = condition[item.id] ? condition[item.id] : this._conditionMaster.items.find(frequency => frequency.id === item.id).default;
    }
    return condition;
  }

}