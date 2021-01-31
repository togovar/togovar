import StoreManager from "./StoreManager.js";

const RULER_NUMBER_OF_STEP = 10;

export default class RangeSelectorView {

  /**
   * 
   * @param {HTMLElement} parentNode 
   * @param {Number} min
   * @param {Number} max
   * @param {String} orientation 'horizontal' or 'vertical'
   * @param {String} conditionKey
   * @param {String} searchType 'simple' or 'advanced'
   */
  constructor(elm, min = 0, max, orientation, conditionKey, searchType) {
    this._conditionKey = conditionKey;
    this._searchType = searchType;
    //StoreManager.bind('appStatus', this);
    const ruler = (() => {
      let html = '';
      const step = Math.round(max * 1000 / RULER_NUMBER_OF_STEP);
      console.log(step)
      for (let i = 0; i <= RULER_NUMBER_OF_STEP; i++) {
        html += `<div class="scale">${(step * i) * 0.001}</div>`;
      }
      return html;
    })();
    elm.innerHTML = `
      <div class="input">
        <input class="from" max="1" min="0" step="0.01" type="number" value="0.000">
        ~
        <input class="to" max="1" min="0" step="0.01" type="number" value="1.000">
        <label>
          <input class="invert" type="checkbox">Invert range
        </label>
      </div>
      <div class="meter">
        <div class="barcontainer">
          <div class="bar -primary"></div>
          <div class="bar -secondary"></div>
        </div>
        <div class="ruler">${ruler}</div>
        <div class="slider">
          <div class="from"></div>
          <div class="to"></div>
        </div>
      </div>
      ${searchType === 'simple' ?
      `<div class="match">
        <label>
          <input class="all" name="match" type="radio" value="all">
          for all datasets
        </label>
        <label>
          <input class="any" checked="checked" name="match" type="radio" value="any">
          for any dataset
        </label>
      </div>` : ''}`;
    elm.classList.add(`-${orientation}`);

    // references
    const input = elm.querySelector(':scope > .input');
    this._from = input.querySelector(':scope > input.from');
    this._to = input.querySelector(':scope > input.to');
    this._invert = input.querySelector(':scope > label > input.invert');
    const meter = elm.querySelector(':scope > .meter');
    this._barPrimary = meter.querySelector(':scope > .barcontainer > .bar.-primary');
    this._barSecondary = meter.querySelector(':scope > .barcontainer > .bar.-secondary');
    this._slider = meter.querySelector(':scope > .slider');
    this._sliderWidth = this._slider.offsetWidth - 16;
    this._sliderFrom = this._slider.querySelector(':scope > .from');
    this._sliderTo = this._slider.querySelector(':scope > .to');
    const match = elm.querySelector(':scope > .match');
    if (match) {
      this._all = match.querySelector(':scope > label > .all');
      this._any = match.querySelector(':scope > label > .any');
    }

    // default values
    this._conditionMaster = StoreManager.getSearchConditionMaster(this._conditionKey);
    const condition = this._getFrequency();
    switch (searchType) {
      case 'simple':
        this._from.value = condition.from;
        this._to.value = condition.to;
        this._invert.checked = condition.invert === '1';
        this._all.checked = condition.match === 'all';
        break;
      case 'advanced':
        break;
    }
    this._changeFilter({});

    // events
    StoreManager.bind('searchConditions', this);
    this._from.addEventListener('change', e => {
      this._changeFilter({from: e.target.value + ''});
    });
    this._to.addEventListener('change', e => {
      this._changeFilter({to: e.target.value + ''});
    });
    this._invert.addEventListener('change', e => {
      this._changeFilter({invert: e.target.checked ? '1' : '0'});
    });
    this._all.addEventListener('change', e => {
      this._changeFilter({match: e.target.checked ? 'all' : 'any'});
    });
    this._any.addEventListener('change', e => {
      this._changeFilter({match: e.target.checked ? 'any' : 'all'});
    });
    $('.slider > *', meter).draggable({
      axis: 'x',
      containment: this._slider,
      drag: this._drag.bind(this)
    });

  }

  _drag(e, ui) {
    switch (true) {
      case e.target.classList.contains('from'):
        this._changeFilter({from: Math.ceil((ui.position.left / this._sliderWidth) * 100) * 0.01});
        break;
      case e.target.classList.contains('to'):
        this._changeFilter({to: Math.floor(((ui.position.left - 8) / this._sliderWidth) * 100) * 0.01});
        break;
    }
  }

  _getFrequency() {
    let condition = StoreManager.getSearchCondition(this._conditionKey);
    console.log(condition);
    // if the filter condition is not defined, generate it from master.
    condition = condition ? condition : this._conditionMaster.items.reduce((acc, item) => Object.assign(acc, {[item.id]: item.default}), {});
    console.log(condition);
    // if each items of the condition are not defined, generate them from master.items
    for (const item of this._conditionMaster.items) {
      condition[item.id] = condition[item.id] ? condition[item.id] : this._conditionMaster.items.find(frequency => frequency.id === item.id).default;
    }
    return condition;
  }

  _changeFilter(newCondition) {
    console.log(newCondition);
    // ensure sliders are not interchanged
    switch (true) {
      case newCondition.from !== undefined:
        if (this._to.value <= newCondition.from) {
          newCondition.from = (parseFloat(this._to.value) - 0.001) + '';
        }
        break;
      case newCondition.to !== undefined:
        if (newCondition.to <= this._from.value) {
          newCondition.to = (parseFloat(this._from.value) + 0.001) + '';
        }
        break;
    }

    // set store
    const condition = this._getFrequency();
    for (const key in newCondition) {
      condition[key] = newCondition[key];
    }
    StoreManager.setSearchCondition(this._conditionKey, condition);
  }

  searchConditions(conditions) {
    const condition = conditions[this._conditionKey];
    if (condition === undefined) return;
    // values
    this._from.value = condition.from;
    this._to.value = condition.to;
    // slider
    this._sliderFrom.style.left = `${this._sliderWidth * this._from.value}px`;
    this._sliderTo.style.left = `${this._sliderWidth * this._to.value + 8}px`;
    // meter
    if (condition.invert === '1') {
      this._barPrimary.style.left = '0%';
      this._barPrimary.style.width = `${condition.from * 100}%`;
      this._barSecondary.style.display = 'block';
      this._barSecondary.style.left = `${condition.to * 100}%`;
      this._barSecondary.style.width = `${(1 - condition.to) * 100}%`;
    } else {
      this._barPrimary.style.left = `${condition.from * 100}%`;
      this._barPrimary.style.width = `${(condition.to - condition.from) * 100}%`;
      this._barSecondary.style.display = 'none';
    }
    // invert
    this._invert.checked = condition.invert === '1';
    // match
    this._all.checked = condition.match === 'all';
    this._any.checked = condition.match === 'any';
  }

}
