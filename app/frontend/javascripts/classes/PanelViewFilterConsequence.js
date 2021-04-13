import CollapseView from "./CollapseView.js";
import PanelView from "./PanelView.js";
import StoreManager from "./StoreManager.js";

const KIND_OF_CONDITION = 'consequence';

export default class PanelViewFilterConsequence extends PanelView {

  constructor(elm) {
    super(elm, 'consequence');
    // 検索条件マスター
    const conditionMaster = StoreManager.getSearchConditionMaster(this.kind);
    const grouping = StoreManager.getSearchConditionMaster('consequence_grouping').items;
    // GUIの生成
    this._createGUI(conditionMaster, grouping);
    // collapse menu
    elm.querySelectorAll('.collapse-view').forEach(collapseView => new CollapseView(collapseView) );
    // references
    const condition = StoreManager.getSearchCondition(this.kind);
    this._inputsValues = {};
    this.elm.querySelectorAll('.content > .checklist-values input').forEach(input => {
      this._inputsValues[input.value] = {
        input: input,
        value: input.parentNode.nextElementSibling
      }
      if (condition && condition[input.value]) { // チェックの初期状態
        input.checked = condition[input.value] === '1';
      }
    });
    this._inputsValues.all.values = this.findValues(grouping, []); // 入れ子要素を持つチェックボックスの子要素を収集
    this.updateNestedCheckboxes();
    // events
    for (const key in this._inputsValues) {
      this._inputsValues[key].input.addEventListener('change', this._changeFilter.bind(this));
    }
    StoreManager.bind('searchConditions', this);
    StoreManager.bind('statisticsConsequence', this);
  }

  /*
  // 検索条件マスター
  searchConditionsMaster(master) {
    const conditionMaster = master.find(condition => condition.id === this.kind).items;
    const grouping = master.find(condition => condition.id === 'consequence_grouping').items;
    console.log(grouping)
    // GUIの生成
    this._createGUI(conditionMaster, grouping);
    // accordion
    this.elm.querySelectorAll('.-haschildren > .accordionbutton').forEach(elm => {
      elm.addEventListener('click', () => {
        elm.parentNode.classList.toggle('-collapsed');
      })
    });
    // references
    const condition = StoreManager.getSearchCondition(this.kind);
    console.log(condition)
    this._inputsValues = {};
    this.elm.querySelectorAll('.content > .checklist-values input').forEach(input => {
      this._inputsValues[input.value] = {
        input: input,
        value: input.parentNode.nextElementSibling
      }
      if (condition && condition[input.value]) { // チェックの初期状態
        input.checked = condition[input.value] === '1';
      }
    });
    console.log(this._inputsValues)
  }
  */

  _createGUI(conditionMaster, grouping) {
    let html = `
      <li class="item">
        <label class="label">
          <input type="checkbox" value="all" data-has-children="true" checked>
          All
        </label>
        <span class="value"></span>
      </li>
      <li class="separator"><hr></li>
    `;
    html += grouping.map(group => this.render(conditionMaster, group)).join('');
    this.elm.querySelector('.content > .checklist-values').insertAdjacentHTML('beforeend', html);
    // transcript variant は開く
    this.elm.querySelector('.content > .checklist-values > .item:nth-child(3)').classList.remove('-collapsed');
  }

  render(conditionMaster, item) {
    const hasChildren = typeof item === 'object';
    item = hasChildren ? item : conditionMaster.items.find(condition => condition.id === item);

    return `
      <li class="item${hasChildren ? ' collapse-view -hierarchic -collapsed' : ''}">
        ${hasChildren ? '<div class="collapsebutton"></div>' : ''}
        <label class="label">
          <input type="checkbox" value="${item.id ? item.id : item.label}" data-has-children="${item.items ? 'true' : 'false'}" checked>
          ${item.label}
        </label>
        <span class="value"></span>
        ${hasChildren ? `
        <ul class="checklist-values collapsecontent">
          ${item.items.map(item => this.render(conditionMaster, item)).join('')}
        </ul>
        ` : ''}
      </li>
    `;
  }

  // 入れ子の consequence の値を収集
  findValues(items, accumulator) {
    let values = [];
    for (const item of items) {
      const hasChildren = typeof item === 'object';
      if (hasChildren) {
        const values2 = this.findValues(item.items, []);
        this._inputsValues[item.label].values = values2;
        values = values.concat(values2);
      } else {
        accumulator.push(item);
      }
    }
    values = values.concat(accumulator);
    return values;
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
    } else if (e.target.dataset.hasChildren === 'true') {
      // 子要素のあるチェックボックスの場合、子要素のチェック状態を変更
      for (const value of this._inputsValues[e.target.value].values) {
        this._inputsValues[value].input.checked = e.target.checked;
      }
    } else {
      // not all
      this.updateNestedCheckboxes();
    }
    // Store に検索条件をセット
    const checked = {};
    for (const key in this._inputsValues) {
      const input = this._inputsValues[key];
      if (input.values === undefined) {
        checked[key] = this._inputsValues[key].input.checked ? '1' : '0';
      }
    }
    StoreManager.setSearchCondition(KIND_OF_CONDITION, checked);
  }

  updateNestedCheckboxes() {
    for (const key in this._inputsValues) {
      const input = this._inputsValues[key];
      if (input.values) {
        // 入れ子要素のある要素の選択状態
        input.input.checked = !input.values.reduce((accumulator, value) => accumulator + !this._inputsValues[value].input.checked, 0);
      }
    }
  }

  // フィルターを更新すると呼ばれる
  searchConditions(searchConditions) {
    for (const key in searchConditions[KIND_OF_CONDITION]) {
      this._inputsValues[key].input.checked = searchConditions[KIND_OF_CONDITION][key] !== '0';
    }
    this.updateNestedCheckboxes();
  }

  // 統計情報の更新
  statisticsConsequence(values) {
    if (values) {
      for (const key in this._inputsValues) {
        const input = this._inputsValues[key];
        if (input.values === undefined) {
          // 入れ子要素を持たない項目
          input.value.textContent = (values[key] ? values[key] : 0).toLocaleString();
        }
      }
    } else {
      // 統計値が帰ってこなかった場合
      for (const key in this._inputsValues) {
        const input = this._inputsValues[key];
        if (input.values === undefined) {
          this._inputsValues[key].value.textContent = '0';
        }
      }
    }
    this._inputsValues.all.value.textContent = StoreManager.getData('searchStatus').filtered.toLocaleString();
  }

}
