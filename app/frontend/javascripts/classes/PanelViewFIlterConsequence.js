import PanelView from "./PanelView.js";
import StoreManager from "./StoreManager.js";

const KIND_OF_CONDITION = 'consequence';

export default class PanelViewFilterConsequence extends PanelView {

  constructor(elm) {
    super(elm, 'consequence');

    const conditionMaster = StoreManager.getSearchConditionMaster(this.kind);
    const grouping = StoreManager.getSearchConditionMaster('consequence_grouping').items;

    this.createGUI(conditionMaster, grouping);

    this.elm.querySelectorAll('.-haschildren > .accordionbutton').forEach(elm => {
      elm.addEventListener('click', () => {
        elm.parentNode.classList.toggle('-opened');
      })
    });

    const condition = StoreManager.getSearchCondition(this.kind);
    this.inputsValues = {};
    this.elm.querySelectorAll('.content > .checklist-values input').forEach(input => {
      this.inputsValues[input.value] = {
        input: input,
        value: input.parentNode.nextElementSibling
      };
      if (condition && condition[input.value]) {
        input.checked = condition[input.value] === '1';
      }
    });
    this.inputsValues.all.values = this.findValues(grouping, []); // 入れ子要素を持つチェックボックスの子要素を収集
    this.updateNestedCheckboxes();
    // events
    for (const key in this.inputsValues) {
      this.inputsValues[key].input.addEventListener('change', this.changeFilter.bind(this));
    }
    StoreManager.bind('searchConditions', this);
    StoreManager.bind('statisticsConsequence', this);
  }

  createGUI(conditionMaster, grouping) {
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
    this.elm.querySelector('.content > .checklist-values > .item:nth-child(3)').classList.add('-opened');
  }

  render(conditionMaster, item) {
    const hasChildren = typeof item === 'object';

    item = hasChildren ? item : conditionMaster.items.find(condition => condition.id === item);

    return `
      <li class="item${hasChildren ? ' -haschildren' : ''}">
        ${hasChildren ? '<div class="accordionbutton"></div>' : ''}
        <label class="label">
          <input type="checkbox" value="${item.id ? item.id : item.label}" data-has-children="${item.items ? 'true' : 'false'}" checked>
          ${item.label}
        </label>
        <span class="value"></span>
        ${hasChildren ? `
        <ul class="checklist-values">
          ${item.items.map(item => this.render(conditionMaster, item)).join('')}
        </ul>
        ` : ''}
      </li>
    `;
  }

  findValues(items, accumulator) {
    let values = [];
    for (const item of items) {
      const hasChildren = typeof item === 'object';
      if (hasChildren) {
        const values2 = this.findValues(item.items, []);
        this.inputsValues[item.label].values = values2;
        values = values.concat(values2);
      } else {
        accumulator.push(item);
      }
    }
    values = values.concat(accumulator);
    return values;
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
    } else if (e.target.dataset.hasChildren === 'true') {
      for (const value of this.inputsValues[e.target.value].values) {
        this.inputsValues[value].input.checked = e.target.checked;
      }
    } else {
      this.updateNestedCheckboxes();
    }
    const checked = {};
    for (const key in this.inputsValues) {
      const input = this.inputsValues[key];
      if (input.values === undefined) {
        checked[key] = this.inputsValues[key].input.checked ? '1' : '0';
      }
    }
    StoreManager.setSearchCondition(KIND_OF_CONDITION, checked);
  }

  updateNestedCheckboxes() {
    for (const key in this.inputsValues) {
      const input = this.inputsValues[key];
      if (input.values) {
        input.input.checked = !input.values.reduce((accumulator, value) => accumulator + !this.inputsValues[value].input.checked, 0);
      }
    }
  }

  searchConditions(searchConditions) {
    for (const key in searchConditions[KIND_OF_CONDITION]) {
      this.inputsValues[key].input.checked = searchConditions[KIND_OF_CONDITION][key] !== '0';
    }
    this.updateNestedCheckboxes();
  }

  statisticsConsequence(values) {
    if (values) {
      for (const key in this.inputsValues) {
        const input = this.inputsValues[key];
        if (input.values === undefined) {
          // 入れ子要素を持たない項目
          input.value.textContent = (values[key] ? values[key] : 0).toLocaleString();
        }
      }
    } else {
      for (const key in this.inputsValues) {
        const input = this.inputsValues[key];
        if (input.values === undefined) {
          this.inputsValues[key].value.textContent = '0';
        }
      }
    }
    this.inputsValues.all.value.textContent = StoreManager.getData('searchStatus').filtered.toLocaleString();
  }
}
