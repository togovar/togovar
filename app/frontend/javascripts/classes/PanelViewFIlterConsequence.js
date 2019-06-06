import PanelView from "./PanelView.js";
import StoreManager from "./StoreManager.js";

export default class PanelViewFilterConsequence extends PanelView {

  constructor(elm) {
    super(elm, 'consequence');

    const conditionMaster = StoreManager.getData('searchConditionsMaster').find(condition => condition.id === this.kind);
    const grouping = StoreManager.getData('searchConditionsMaster').find(condition => condition.id === 'consequence_grouping').items;

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
  }

  searchConditionsMaster(master) {
    const conditionMaster = master.find(condition => condition.id === this.kind).items;
    const grouping = master.find(condition => condition.id === 'consequence_grouping').items;

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
  }

  createGUI(conditionMaster, grouping) {
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
          <input type="checkbox" value="${item.id}" checked>
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
}
