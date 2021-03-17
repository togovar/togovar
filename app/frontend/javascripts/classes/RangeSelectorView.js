import Decimal from 'decimal.js';

const RULER_NUMBER_OF_STEP = 10;

export default class RangeSelectorView {

  /**
   * 
   * @param {HTMLElement} elm
   * @param {Object} delegate
   * @param {Number} _min
   * @param {Number} max
   * @param {String} orientation 'horizontal' or 'vertical'
   * @param {String} searchType 'simple' or 'advanced'
   */
  constructor(elm, delegate, _min = 0, max, orientation, searchType) {
    this.elm = elm;
    this._delegate = delegate;
    this._orientation = orientation;
    this._searchType = searchType;
    const ruler = (() => {
      let html = '';
      const step = new Decimal(max / RULER_NUMBER_OF_STEP);
      for (let i = 0; i <= RULER_NUMBER_OF_STEP; i++) {
        html += `<div class="scale">${orientation === 'vertical' ? step.times(new Decimal(i)).toNumber() : ''}</div>`;
      }
      return html;
    })();
    elm.innerHTML = `
      <div class="input">
        <input class="from" max="1" min="0" step="0.01" type="number" value="0">
        ~
        <input class="to" max="1" min="0" step="0.01" type="number" value="1">
        <label>
          <input class="invert" type="checkbox">Invert range
        </label>
      </div>
      <div class="meter">
        <div class="barcontainer">
          <div class="bar"></div>
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
    this._bar = meter.querySelector(':scope > .barcontainer > .bar');
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
    this._changeParameter({});

    // events
    this._from.addEventListener('change', e => {
      console.log(typeof e.target.value)
      e.target.value = parseFloat(e.target.value) < 0 ? 0 : e.target.value;
      this._changeParameter({from: e.target.value + ''});
    });
    this._to.addEventListener('change', e => {
      e.target.value = parseFloat(e.target.value) > 1 ? 1 : e.target.value;
      this._changeParameter({to: e.target.value + ''});
    });
    this._invert.addEventListener('change', e => {
      this._changeParameter({invert: e.target.checked ? '1' : '0'});
    });
    if (match) {
      this._all.addEventListener('change', e => {
        this._changeParameter({match: e.target.checked ? 'all' : 'any'});
      });
      this._any.addEventListener('change', e => {
        this._changeParameter({match: e.target.checked ? 'any' : 'all'});
      });
    }
    $('.slider > *', meter).draggable({
      axis: 'x',
      containment: this._slider,
      stop: this._dragEnd.bind(this)
    });

  }

  _dragEnd(e, ui) {
    Decimal.precision = 3;
    switch (true) {
      case e.target.classList.contains('from'):
        this._changeParameter({from: Decimal.div(ui.position.left, this._sliderWidth).toNumber()});
        break;
      case e.target.classList.contains('to'):
        this._changeParameter({to: Decimal.div(ui.position.left - 8, this._sliderWidth).toNumber()});
        break;
    }
  }

  _changeParameter(newCondition) {
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

    // feedback
    this._delegate.changeParameter(newCondition, this.elm.dataset ? this.elm.dataset.dataset : '');
  }

  updateGUIWithCondition(condition) {
    // values
    this._from.value = condition.from;
    this._to.value = condition.to;
    // slider
    this._sliderFrom.style.left = this.fromPosition;
    this._sliderTo.style.left = this.toPosition;
    // meter
    this._bar.style.left = `${condition.from * 100}%`;
    this._bar.style.width = `${(condition.to - condition.from) * 100}%`;
    // invert
    this._invert.checked = condition.invert === '1' || condition.invert === true;
    if (this._invert.checked) {
      this.elm.classList.add('-inverting');
    } else {
      this.elm.classList.remove('-inverting');
    }
    // match
    if (this._searchType === 'simple') {
      this._all.checked = condition.match === 'all';
      this._any.checked = condition.match === 'any';
    }
  }

  // get _sliderWidth() {
  //   return this._slider.offsetWidth - 16;
  // }
  get fromPosition() {
    return `${this._sliderWidth * this._from.value}px`;
  }
  get toPosition() {
    return `${this._sliderWidth * this._to.value + 8}px`;
  }

}
