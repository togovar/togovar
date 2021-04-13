import PanelView from "./PanelView.js";
import StoreManager from "./StoreManager.js";

export default class PanelViewCheckList extends PanelView {

  constructor(elm, type, statisticsType) {
    super(elm, type);
    this._statisticsType = statisticsType;
    // 検索条件マスター
    const conditionMaster = StoreManager.getData('searchConditionsMaster').find(condition => condition.id === this.kind);
    // GUIの生成
    this._createGUI(conditionMaster);
    // references
    const condition = StoreManager.getSearchCondition(this.kind);
    this._inputsValues = {};
    this.elm.querySelectorAll('.content > .checklist-values > .item > .label > input').forEach(input => {
      this._inputsValues[input.value] = {
        input: input,
        value: input.parentNode.nextElementSibling
      }
      if (condition && condition[input.value]) { // チェックの初期状態
        input.checked = condition[input.value] === '1';
      }
    });
    this._changeFilter();
    // events
    for (const key in this._inputsValues) {
      this._inputsValues[key].input.addEventListener('change', this._changeFilter.bind(this));
    }
    StoreManager.bind('searchConditions', this);
    StoreManager.bind(this._statisticsType, this);
    // 統計情報の更新
    this[this._statisticsType] = values => {
      if (values) {
        let all = 0;
        for (const key in this._inputsValues) {
          const count = values[key] ? values[key] : 0;
          all += count;
          this._inputsValues[key].value.textContent = count.toLocaleString();
        }
        this._inputsValues.all.value.textContent = all.toLocaleString();
      } else {
        // 統計値が返ってこなかった場合
        for (const key in this._inputsValues) {
          this._inputsValues[key].value.textContent = '0';
        }
      }
      this._inputsValues.all.value.textContent = StoreManager.getData('searchStatus').filtered.toLocaleString();
    }
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
          Not in ClinVar
        </label>
        <span class="value"></span>
      </li>
      <li class="separator"><hr></li>
      `;
    }
    html += conditionMaster.items.map(item => `
    <li class="item">
      <label class="label">
        <input type="checkbox" value="${item.id}" checked>
        ${this.kind === 'dataset' ? `<div class="dataset-icon" data-dataset="${item.id}"><div class="properties"></div></div>` : ''}
        ${this.kind === 'significance' ? `<div class="clinical-significance" data-sign="${item.id}"></div>` : ''}
        ${this.kind === 'sift' ? `<div class="variant-function _width_5em _align-center" data-function="${item.id}">${ { D: '&lt; 0.05', T: '≥ 0.05' }[item.id] }</div>` : ''}
        ${this.kind === 'polyphen' ? `<div class="variant-function _width_5em _align-center" data-function="${item.id}">${ { PROBD: '&gt; 0.908', POSSD: '&gt; 0.446', B: '≤ 0.446', U: '&ensp;&ensp;' }[item.id] }</div>` : ''}
        ${item.label}
      </label>
      <span class="value"></span>
    </li>
    `).join('');
    this.elm.querySelector('.content > .checklist-values').insertAdjacentHTML('beforeend', html);
    // clinical significance で not in clinvar の重複を削除
    if (this.kind === 'significance') {
      this.elm.querySelector('.content > .checklist-values > .item:nth-child(5)').remove();
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
    StoreManager.setSearchCondition(this.kind, checked);
  }

  // フィルターを更新すると呼ばれる
  searchConditions(searchConditions) {
    let isAll = 0;
    for (const key in searchConditions[this.kind]) {
      this._inputsValues[key].input.checked = searchConditions[this.kind][key] !== '0';
      isAll += searchConditions[this.kind][key] === '0';
    }
    this._inputsValues.all.input.checked = isAll === 0;
  }

}
