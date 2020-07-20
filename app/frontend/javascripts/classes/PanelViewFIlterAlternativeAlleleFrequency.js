/*global $ */

import PanelView from "./PanelView.js";
import StoreManager from "./StoreManager.js";

export default class PanelViewFilterAlternativeAlleleFrequency extends PanelView {
  constructor(elm) {
    super(elm, 'frequency');
    // references
    const rangeSelector = this.elm.querySelector('.content > .range-selector');
    this.from = rangeSelector.querySelector('.input > input.from');
    this.to = rangeSelector.querySelector('.input > input.to');
    this.invert = rangeSelector.querySelector('.input label > input.invert');
    this.barPrimary = rangeSelector.querySelector('.meter > .barcontainer > .bar.-primary');
    this.barSecondary = rangeSelector.querySelector('.meter > .barcontainer > .bar.-secondary');
    this.slider = rangeSelector.querySelector('.meter > .slider');
    this.sliderWidth = this.slider.offsetWidth - 16;
    this.sliderFrom = this.slider.querySelector('.from');
    this.sliderTo = this.slider.querySelector('.to');
    this.all = rangeSelector.querySelector('.match > label > .all');
    this.any = rangeSelector.querySelector('.match > label > .any');
    // default
    this.conditionMaster = StoreManager.getSearchConditionMaster(this.kind);
    const condition = this.getFrequency();
    this.from.value = condition.from;
    this.to.value = condition.to;
    this.invert.checked = condition.invert === '1';
    this.all.checked = condition.match === 'all';
    this._changeFilter({});
    // events
    StoreManager.bind('searchConditions', this);
    this.from.addEventListener('change', e => {
      this._changeFilter({from: e.target.value + ''});
    });
    this.to.addEventListener('change', e => {
      this._changeFilter({to: e.target.value + ''});
    });
    this.invert.addEventListener('change', e => {
      this._changeFilter({invert: e.target.checked ? '1' : '0'});
    });
    this.all.addEventListener('change', e => {
      this._changeFilter({match: e.target.checked ? 'all' : 'any'});
    });
    this.any.addEventListener('change', e => {
      this._changeFilter({match: e.target.checked ? 'any' : 'all'});
    });
    $('.meter > .slider > *', rangeSelector).draggable({
      axis: 'x',
      containment: this.slider,
      drag: this.drag.bind(this)
    });
  }

  drag(e, ui) {
    switch (true) {
      case e.target.classList.contains('from'):
        this._changeFilter({from: Math.ceil((ui.position.left / this.sliderWidth) * 100) * 0.01});
        break;
      case e.target.classList.contains('to'):
        this._changeFilter({to: Math.floor(((ui.position.left - 8) / this.sliderWidth) * 100) * 0.01});
        break;
    }
  }

  getFrequency() {
    let condition = StoreManager.getSearchCondition('frequency');
    condition = condition ? condition : this.conditionMaster.items.reduce((acc, item) => Object.assign(acc, {[item.id]: item.default}), {});
    for (const item of this.conditionMaster.items) {
      condition[item.id] = condition[item.id] ? condition[item.id] : this.conditionMaster.items.find(frequency => frequency.id === item.id).default;
    }
    return condition;
  }

  _changeFilter(newCondition) {
    switch (true) {
      case newCondition.from !== undefined:
        if (this.to.value <= newCondition.from) {
          newCondition.from = (parseFloat(this.to.value) - 0.001) + '';
        }
        break;
      case newCondition.to !== undefined:
        if (newCondition.to <= this.from.value) {
          newCondition.to = (parseFloat(this.from.value) + 0.001) + '';
        }
        break;
    }
    const condition = this.getFrequency();
    for (const key in newCondition) {
      condition[key] = newCondition[key];
    }
    StoreManager.setSearchCondition('frequency', condition);
  }

  searchConditions(conditions) {
    const condition = conditions.frequency;
    if (condition === undefined) return;
    // values
    this.from.value = condition.from;
    this.to.value = condition.to;
    // slider
    this.sliderFrom.style.left = `${this.sliderWidth * this.from.value}px`;
    this.sliderTo.style.left = `${this.sliderWidth * this.to.value + 8}px`;
    // meter
    if (condition.invert === '1') {
      this.barPrimary.style.left = '0%';
      this.barPrimary.style.width = `${condition.from * 100}%`;
      this.barSecondary.style.display = 'block';
      this.barSecondary.style.left = `${condition.to * 100}%`;
      this.barSecondary.style.width = `${(1 - condition.to) * 100}%`;
    } else {
      this.barPrimary.style.left = `${condition.from * 100}%`;
      this.barPrimary.style.width = `${(condition.to - condition.from) * 100}%`;
      this.barSecondary.style.display = 'none';
    }
    // invert
    this.invert.checked = condition.invert === '1';
    // match
    this.all.checked = condition.match === 'all';
    this.any.checked = condition.match === 'any';
  }
}
