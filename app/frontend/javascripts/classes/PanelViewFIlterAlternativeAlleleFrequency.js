/*global $ */
import PanelView from "./PanelView.js";
import StoreManager from "./StoreManager.js";
import {DEFAULT_CONDITIONS} from "../global.js";

export default class PanelViewFilterAlternativeAlleleFrequency extends PanelView {

  constructor(elm) {
    super(elm, 'frequency');

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

    const condition = this.getFrequency();
    this.from.value = condition.from;
    this.to.value = condition.to;
    this.invert.checked = condition.invert === '1';
    this.all.checked = condition.match === 'all';
    this.changeFilter({});

    StoreManager.bind('searchConditions', this);
    this.from.addEventListener('change', e => {
      this.changeFilter({from: e.target.value + ''});
    });
    this.to.addEventListener('change', e => {
      this.changeFilter({to: e.target.value + ''});
    });
    this.invert.addEventListener('change', e => {
      this.changeFilter({invert: e.target.checked ? '1' : '0'});
    });
    this.all.addEventListener('change', e => {
      this.changeFilter({match: e.target.checked ? 'all' : 'any'});
    });
    this.any.addEventListener('change', e => {
      this.changeFilter({match: e.target.checked ? 'any' : 'all'});
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
        this.changeFilter({from: Math.ceil((ui.position.left / this.sliderWidth) * 100) * 0.01});
        break;
      case e.target.classList.contains('to'):
        this.changeFilter({to: Math.floor(((ui.position.left - 8) / this.sliderWidth) * 100) * 0.01});
        break;
    }
  }

  getFrequency() {
    let condition = StoreManager.getSearchCondition('frequency');
    condition = condition ? condition : DEFAULT_CONDITIONS.frequency;
    for (const key in DEFAULT_CONDITIONS.frequency) {
      condition[key] = condition[key] ? condition[key] : DEFAULT_CONDITIONS.frequency[key];
    }
    return condition;
  }

  changeFilter(newCondition) {
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

    this.from.value = condition.from;
    this.to.value = condition.to;

    this.sliderFrom.style.left = `${this.sliderWidth * this.from.value}px`;
    this.sliderTo.style.left = `${this.sliderWidth * this.to.value + 8}px`;

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

    this.invert.checked = condition.invert === '1';

    this.all.checked = condition.match === 'all';
  }
}
