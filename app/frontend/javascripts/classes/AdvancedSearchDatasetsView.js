import StoreManager from './StoreManager.js';
import CollapseView from './CollapseView.js';
import RangeSelectorView from "./RangeSelectorView.js";

export default class AdvancedSearchDatasetsView {

  constructor(elm) {
    // generate
    console.log(elm)
    const datasetMaster = StoreManager.getSearchConditionMaster('dataset');
    const tbody = elm.querySelector(':scope > .tablecontainer > table > tbody');
    tbody.innerHTML = `
    ${datasetMaster.items.map(item => {
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
            <div class="range-selector-view"></div>
          </div>
        </td>
        <td>
          <div class="variantcallingquality">
            <input type="checkbox" value="">
          </div>
        </td>
      </tr>
      `;
    }).join('')}
    `;
    console.log(  )

    this._conditionMaster = StoreManager.getSearchConditionMaster('adv_frequency');
    console.log(this._conditionMaster)

    // collapse
    elm.querySelectorAll('.collapse-view').forEach(elm => {
      new CollapseView(elm);
    });
  }

}