import StoreManager from "./StoreManager.js";
import {TR_HEIGHT} from '../global.js';

const RELEASE_DURATION = 2000;
const MIN_HEIGHT = 30;

export default class ScrollBar {

  constructor(elm) {
    this.elm = elm;
    this.elm.insertAdjacentHTML('beforeend', `
      <div class="bar">
        <div class="indicator">
          <span class="position">1</span>
          <span class="total"></span>
        </div>
      </div>
    `);
    this.bar = this.elm.querySelector('.bar');
    this.position = this.bar.querySelector('.position');
    this.total = this.bar.querySelector('.total');
    this.timeoutId;

    // イベント
    StoreManager.bind('offset', this);
    StoreManager.bind('numberOfRecords', this);
    StoreManager.bind('rowCount', this);
    $(this.bar).draggable({
      axis: 'y',
      containment: this.elm,
      cursor: 'grab',
      drag: this.drag.bind(this)
    });

  }

  drag(e, ui) {
    const
      rowCount = StoreManager.getData('rowCount'),
      numberOfRecords = StoreManager.getData('numberOfRecords'),
      availableHeight = rowCount * TR_HEIGHT - this.bar.offsetHeight * 0,
      offsetRate = ui.position.top / availableHeight;
    let
      offset = Math.ceil(offsetRate * numberOfRecords);
    offset = offset < 0 ? 0 : offset;
    offset = (offset + rowCount) > numberOfRecords ? numberOfRecords - rowCount : offset;
    StoreManager.setData('offset', offset);
    this.prepareRelease();
  }

  offset(offset) {
    this.position.textContent = offset + 1;
    this.update();
  }

  numberOfRecords(numberOfRecords) {
    this.total.textContent = numberOfRecords.toLocaleString();
    this.update();
  }

  rowCount() {
    this.update();
  }

  update() {
    const
      offset = StoreManager.getData('offset'),
      rowCount = StoreManager.getData('rowCount'),
      numberOfRecords = StoreManager.getData('numberOfRecords'),
      totalHeight = numberOfRecords * TR_HEIGHT, // 全体の高さ
      offsetHeight = offset * TR_HEIGHT, // オフセット量
      displayHeight = rowCount * TR_HEIGHT, // 表示領域
      displayRate = displayHeight / totalHeight;
    let
      barHeight = Math.ceil(displayHeight * displayRate);
    barHeight = barHeight < MIN_HEIGHT ? MIN_HEIGHT : barHeight;
    const
      availableHeight = displayHeight - barHeight * 0,
      availableRate = availableHeight / totalHeight,
      barTop = Math.ceil(offsetHeight * availableRate);
    this.bar.style.height = `${barHeight}px`;
    this.bar.style.top = `${barTop}px`;
    this.prepareRelease();
    if (rowCount === 0 || numberOfRecords === rowCount) {
      this.bar.classList.add('-disabled');
    } else {
      this.bar.classList.remove('-disabled');
    }
  }

  prepareRelease() {
    window.clearTimeout(this.timeoutId);
    this.timeoutId = window.setTimeout(this.release.bind(this), RELEASE_DURATION);
    this.elm.classList.add('-dragging');
  }

  release() {
    this.elm.classList.remove('-dragging');
  }

}
