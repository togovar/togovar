import PanelView from './PanelView.js';
import { storeManager } from '../store/StoreManager';
import {
  setSimpleSearchCondition,
  getSimpleSearchCondition,
  getSimpleSearchConditionMaster,
} from '../store/searchManager';
import '../components/RangeSliderView.js';

export default class PanelViewFilterAlternativeAlleleFrequency extends PanelView {
  constructor(elm) {
    super(elm, 'frequency');

    // default values
    this._conditionMaster = getSimpleSearchConditionMaster(this.kind);
    const condition = this._getConditionFromStore();

    const rangeSlider = document.createElement('range-slider');
    rangeSlider.value1 = condition.from;
    rangeSlider.value2 = condition.to;
    rangeSlider.sliderStep = 0.01;
    rangeSlider.inputStep = 0.05;
    rangeSlider.searchType = 'simple';

    rangeSlider.addEventListener('range-changed', (e) => {
      e.stopPropagation();
      this.changeParameter(e.detail);
    });

    this.elm.querySelector('.range-selector-view').appendChild(rangeSlider);
    this._rangeSelectorView = rangeSlider;

    // events
    storeManager.bind('simpleSearchConditions', this);
  }

  changeParameter(newCondition) {
    const condition = this._getConditionFromStore();
    for (const key in newCondition) {
      condition[key] = newCondition[key];
    }
    setSimpleSearchCondition(this.kind, condition);
  }

  simpleSearchConditions(conditions) {
    const condition = conditions[this.kind];
    if (condition === undefined) return;
  }

  _getConditionFromStore() {
    let condition = getSimpleSearchCondition(this.kind);
    // if the condition is undefined, generate it from master
    condition = condition
      ? condition
      : this._conditionMaster.items.reduce(
          (acc, item) => Object.assign(acc, { [item.id]: item.default }),
          {}
        );
    // if each items of the condition are not defined, generate them from master
    for (const item of this._conditionMaster.items) {
      condition[item.id] = condition[item.id]
        ? condition[item.id]
        : this._conditionMaster.items.find(
            (frequency) => frequency.id === item.id
          ).default;
    }
    return condition;
  }
}
