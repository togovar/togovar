import StoreManager from './StoreManager.js';
import CollapseView from './CollapseView.js';
import RangeSelectorView from "./RangeSelectorView.js";

export default class AdvancedSearchDatasetsView {

  constructor(elm) {
    // generate
    console.log(elm)
    this._conditionMaster = StoreManager.getSearchConditionMaster('adv_frequency');
    console.log(this._conditionMaster)
    const datasetMaster = StoreManager.getSearchConditionMaster('dataset');
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
    console.log(this._rangeSelectorViews)


    // events
    StoreManager.bind('searchConditions', this);

    // collapse
    elm.querySelectorAll('.collapse-view').forEach(elm => {
      new CollapseView(elm);
    });
  }

  changeParameter(newCondition, target) {
    console.log(newCondition)
    console.log(target.elm.dataset.dataset)
    //const condition = this._getConditionFromStore();
    //for (const key in newCondition) {
    //  condition[key] = newCondition[key];
    //}
    //StoreManager.setSearchCondition(this.kind, condition);
  }

  searchConditions(conditions) {
    const condition = conditions[this.kind];
    if (condition === undefined) return;
    this._rangeSelectorView.updateGUIWithCondition(condition);
  }

}