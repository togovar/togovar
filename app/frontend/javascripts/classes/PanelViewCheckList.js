import PanelView from "./PanelView.js";
import StoreManager from "./StoreManager.js";

export default class PanelViewCheckList extends PanelView {

  constructor(elm, type, statisticsType) {
    super(elm, type);
    this.statisticsType = statisticsType;

    const conditionMaster = StoreManager.getData('searchConditionsMaster').find(condition => condition.id === this.kind);

    this.createGUI(conditionMaster);

    const condition = StoreManager.getSearchCondition(this.kind);
    this.inputsValues = {};
    this.elm.querySelectorAll('.content > .checklist-values > .item > .label > input').forEach(input => {
      this.inputsValues[input.value] = {
        input: input,
        value: input.parentNode.nextElementSibling
      };
      if (condition && condition[input.value]) {
        input.checked = condition[input.value] === '1';
      }
    });
    this.changeFilter();

    for (const key in this.inputsValues) {
      this.inputsValues[key].input.addEventListener('change', this.changeFilter.bind(this));
    }
    StoreManager.bind('searchConditions', this);
    StoreManager.bind(this.statisticsType, this);

    // statistics
    this[this.statisticsType] = values => {
      if (values) {
        let all = 0;
        for (const key in this.inputsValues) {
          const count = values[key] ? values[key] : 0;
          all += count;
          this.inputsValues[key].value.textContent = count.toLocaleString();
        }
        this.inputsValues.all.value.textContent = all.toLocaleString();
      } else {
        // 統計値が帰ってこなかった場合
        for (const key in this.inputsValues) {
          this.inputsValues[key].value.textContent = '0';
        }
      }
      this.inputsValues.all.value.textContent = StoreManager.getData('searchStatus').filtered.toLocaleString();
    }
  }

  createGUI(conditionMaster) {
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
          ${this.kind === 'dataset' ? `<div class="dataset-icon" data-dataset="${item.id}"></div>` : ''}
          ${this.kind === 'significance' ? `<div class="clinical-significance" data-sign="${item.id}"></div>` : ''}
          ${this.kind === 'sift' ? `<div class="variant-function _width_5em _align-center" data-function="${item.id}">${{D: '&lt; 0.05', T: '≥ 0.05'}[item.id]}</div>` : ''}
          ${this.kind === 'polyphen' ? `<div class="variant-function _width_5em _align-center" data-function="${item.id}">${{
        PROBD: '&gt; 0.908',
        POSSD: '&gt; 0.446',
        B: '≤ 0.446',
        U: '&ensp;&ensp;'
      }[item.id]}</div>` : ''}
          ${item.label}
        </label>
        <span class="value"></span>
      </li>
    `).join('');

    this.elm.querySelector('.content > .checklist-values').insertAdjacentHTML('beforeend', html);
    if (this.kind === 'significance') {
      this.elm.querySelector('.content > .checklist-values > .item:nth-child(5)').remove();
    }
  }

  changeFilter(e) {
    if (e && e.target.value === 'all') {
      if (e.target.checked) {
        for (const key in this.inputsValues) {
          this.inputsValues[key].input.checked = true;
        }
      } else {
        for (const key in this.inputsValues) {
          this.inputsValues[key].input.checked = false;
        }
      }
    } else {
      let isAll = 0;
      for (const key in this.inputsValues) {
        if (key !== 'all') {
          isAll += !this.inputsValues[key].input.checked;
        }
      }
      this.inputsValues.all.input.checked = isAll === 0;
    }

    const checked = {};
    for (const key in this.inputsValues) {
      if (key !== 'all') {
        checked[key] = this.inputsValues[key].input.checked ? '1' : '0';
      }
    }
    StoreManager.setSearchCondition(this.kind, checked);
  }

  searchConditions(searchConditions) {
    for (const key in searchConditions[this.kind]) {
      this.inputsValues[key].input.checked = searchConditions[this.kind][key] !== '0';
    }
  }
}
