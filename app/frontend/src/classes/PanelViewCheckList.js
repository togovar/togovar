import PanelView from './PanelView.js';
import { storeManager } from '../store/StoreManager';
import {
  setSimpleSearchCondition,
  getSimpleSearchCondition,
} from '../store/searchManager';

/**  Dataset of Statistics / Filters
 * @param {Element} elm - Panel element section.panel-view (#FilterDatasets | #FilterVariantType | #FilterClinicalSignificance | #FilterSift | #FilterPolyphen | #FilterAlphaMissense)
 * @param {string} kind - Panel id (dataset | type | significance | sift | polyphen | alphamissense)
 * @param {string} statisticsType - (statisticsDataset | statisticsType | statisticsSignificance | undefined) */
export default class PanelViewCheckList extends PanelView {
  constructor(elm, kind, statisticsType) {
    super(elm, kind);
    this._statisticsType = statisticsType;
    // 検索条件マスター
    const conditionMaster = storeManager
      .getData('simpleSearchConditionsMaster')
      .find((condition) => condition.id === this.kind);

    // GUIの生成
    this._createGUI(conditionMaster);
    // references
    const condition = getSimpleSearchCondition(this.kind);
    this._inputsValues = {};
    this.elm
      .querySelectorAll('.content > .checklist-values > .item > .label > input')
      .forEach((input) => {
        this._inputsValues[input.value] = {
          input: input,
          value: input.parentNode.nextElementSibling,
        };
        if (condition && condition[input.value]) {
          // チェックの初期状態
          input.checked = condition[input.value] === '1';
        }
      });

    this._changeFilter();
    // events
    for (const key in this._inputsValues) {
      this._inputsValues[key].input.addEventListener(
        'change',
        this._changeFilter.bind(this)
      );
    }

    storeManager.bind('simpleSearchConditions', this);
    storeManager.bind(this._statisticsType, this);

    // 統計情報の更新
    this[this._statisticsType] = (values) => {
      if (values) {
        let all = 0;
        for (const key in this._inputsValues) {
          const count = values[key] ? values[key] : 0;
          all += count;
          this._inputsValues[key].value.textContent = count.toLocaleString();
        }
        this._inputsValues.all.value.textContent = all.toLocaleString();
      }
      this._inputsValues.all.value.textContent = storeManager
        .getData('searchStatus')
        .filtered.toLocaleString();
    };
  }

  _createGUI(conditionMaster) {
    let html = `
    <li class="item">
      <label class="label">
        <input type="checkbox" value="all" checked>
        All
      </label>
      <span class="value"></span>
    </li>
    <li class="separator"><hr></li>
    `;
    if (this.kind === 'significance') {
      html += `
      <li class="item">
        <label class="label">
          <input type="checkbox" value="NC" checked>
          Unassigned
        </label>
        <span class="value"></span>
      </li>
      <li class="separator"><hr></li>
      `;
    }
    if (this.kind === 'alphamissense') {
      html += `
      <li class="item">
        <label class="label">
          <input type="checkbox" value="N" checked>
          Unassigned
        </label>
        <span class="value"></span>
      </li>
      <li class="separator"><hr></li>
      `;
    }
    if (this.kind === 'sift') {
      html += `
      <li class="item">
        <label class="label">
          <input type="checkbox" value="N" checked>
          Unassigned
        </label>
        <span class="value"></span>
      </li>
      <li class="separator"><hr></li>
      `;
    }
    if (this.kind === 'polyphen') {
      html += `
      <li class="item">
        <label class="label">
          <input type="checkbox" value="N" checked>
          Unassigned
        </label>
        <span class="value"></span>
      </li>
      <li class="separator"><hr></li>
      `;
    }

    html += conditionMaster.items
      .map(
        (item) => `
    <li class="item">
      <label class="label">
        <input type="checkbox" value="${item.id}" checked>
        ${
          this.kind === 'dataset'
            ? `<div class="dataset-icon" data-dataset="${item.id}"><div class="properties"></div></div>`
            : ''
        }
        ${
          this.kind === 'significance'
            ? `<div class="clinical-significance" data-value="${item.id}"></div>`
            : ''
        }
        ${
          this.kind === 'sift'
            ? `<div class="variant-function _width_5em _align-center" data-function="${
                item.id
              }">${{ D: '&lt; 0.05', T: '&ge; 0.05' }[item.id]}</div>`
            : ''
        }
        ${
          this.kind === 'polyphen'
            ? `<div class="variant-function _width_5em _align-center" data-function="${
                item.id
              }">${
                {
                  PROBD: '&gt; 0.908',
                  POSSD: '&gt; 0.446',
                  B: '&le; 0.446',
                  U: 'Unknown',
                }[item.id]
              }</div>`
            : ''
        }
        ${
          this.kind === 'alphamissense'
            ? `<div class="variant-function _width_5em _align-center" data-function="${
                item.id
              }">${
                { LP: '&gt; 0.564', A: '&ge; 0.340', LB: '&lt; 0.340' }[item.id]
              }</div>`
            : ''
        }
        ${item.label}
      </label>
      <span class="value"></span>
    </li>
    `
      )
      .join('');
    this.elm
      .querySelector('.content > .checklist-values')
      .insertAdjacentHTML('beforeend', html);
    // not検索の重複を削除
    if (
      ['significance', 'alphamissense', 'sift', 'polyphen'].includes(this.kind)
    ) {
      this.elm
        .querySelector('.content > .checklist-values > .item:nth-child(5)')
        .remove();
    }
  }

  // フィルターの変更
  _changeFilter(e) {
    if (e && e.target.value === 'all') {
      // all
      if (e.target.checked) {
        // 全選択
        for (const key in this._inputsValues) {
          this._inputsValues[key].input.checked = true;
        }
      } else {
        // 全選択解除
        for (const key in this._inputsValues) {
          this._inputsValues[key].input.checked = false;
        }
      }
    } else {
      // not all
      let isAll = 0;
      for (const key in this._inputsValues) {
        if (key !== 'all') {
          isAll += !this._inputsValues[key].input.checked;
        }
      }
      this._inputsValues.all.input.checked = isAll === 0;
    }
    // Store に検索条件をセット
    const checked = {};
    for (const key in this._inputsValues) {
      if (key !== 'all') {
        checked[key] = this._inputsValues[key].input.checked ? '1' : '0';
      }
    }
    setSimpleSearchCondition(this.kind, checked);
  }

  // フィルターを更新すると呼ばれる
  simpleSearchConditions(conditions) {
    let isAll = 0;
    for (const key in conditions[this.kind]) {
      this._inputsValues[key].input.checked =
        conditions[this.kind][key] !== '0';
      isAll += conditions[this.kind][key] === '0';
    }
    this._inputsValues.all.input.checked = isAll === 0;
  }
}
