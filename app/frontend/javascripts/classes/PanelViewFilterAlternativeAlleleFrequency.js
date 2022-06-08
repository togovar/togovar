import PanelView from "./PanelView.js";
import RangeSelectorView from "./RangeSelectorView.js";
import StoreManager from "./StoreManager.js";
import "../components/RangeSliderView.js";

export default class PanelViewFilterAlternativeAlleleFrequency extends PanelView {
  constructor(elm) {
    super(elm, "frequency");

    // default values
    this._conditionMaster = StoreManager.getSearchConditionMaster(this.kind);
    const condition = this._getConditionFromStore();

    const rangeSlider = document.createElement("range-slider");
    rangeSlider.setAttribute("min", 0);
    rangeSlider.setAttribute("max", 1);
    rangeSlider.setAttribute("step", 0.05);

    this.elm.querySelector(".range-selector-view").appendChild(rangeSlider);
    // this._rangeSelectorView = new RangeSelectorView(elm.querySelector('.range-selector-view'), this, 1, 'vertical', 'simple');
    // this._rangeSelectorView.updateGUIWithCondition(condition);

    // events
    StoreManager.bind("simpleSearchConditions", this);
  }

  changeParameter(newCondition) {
    const condition = this._getConditionFromStore();
    for (const key in newCondition) {
      condition[key] = newCondition[key];
    }
    StoreManager.setSimpleSearchCondition(this.kind, condition);
  }

  simpleSearchConditions(conditions) {
    const condition = conditions[this.kind];
    if (condition === undefined) return;
    this._rangeSelectorView.updateGUIWithCondition(condition);
  }

  _getConditionFromStore() {
    let condition = StoreManager.getSearchCondition(this.kind);
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
