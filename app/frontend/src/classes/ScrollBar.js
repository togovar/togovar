import { storeManager } from '../store/StoreManager';
import { TR_HEIGHT } from '../global.js';

const RELEASE_DURATION = 2000;
const MIN_HEIGHT = 30;

export default class ScrollBar {
  constructor(elm) {
    this.elm = elm;
    this.elm.insertAdjacentHTML(
      'beforeend',
      `
      <div class="bar">
        <div class="indicator">
          <span class="position">1</span>
          <span class="total"></span>
        </div>
      </div>
    `
    );
    this.bar = this.elm.querySelector('.bar');
    this.position = this.bar.querySelector('.position');
    this.total = this.bar.querySelector('.total');
    this.timeoutId;

    // イベント
    storeManager.bind('offset', this);
    storeManager.bind('numberOfRecords', this);
    storeManager.bind('rowCount', this);

    // Desktop drag functionality (for mouse devices)
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      this.setupMouseDrag();
    }

    // Touch support for touch devices
    this.setupTouchEvents();
  }

  drag(e, ui) {
    const rowCount = storeManager.getData('rowCount'),
      numberOfRecords = storeManager.getData('numberOfRecords'),
      availableHeight = rowCount * TR_HEIGHT - this.bar.offsetHeight * 0,
      offsetRate = ui.position.top / availableHeight;
    let offset = Math.ceil(offsetRate * numberOfRecords);
    offset = offset < 0 ? 0 : offset;
    offset =
      offset + rowCount > numberOfRecords ? numberOfRecords - rowCount : offset;
    storeManager.setData('offset', offset);
    this.prepareRelease();
  }

  offset(offset) {
    this.position.textContent = offset + 1;
    this.update();

    // Maintain active state on touch devices
    if (
      window.matchMedia('(hover: none) and (pointer: coarse)').matches &&
      this.elm.classList.contains('-active')
    ) {
      return;
    }
  }

  numberOfRecords(numberOfRecords) {
    this.total.textContent = numberOfRecords.toLocaleString();
    this.update();
  }

  rowCount() {
    this.update();
  }

  update() {
    const offset = storeManager.getData('offset'),
      rowCount = storeManager.getData('rowCount'),
      numberOfRecords = storeManager.getData('numberOfRecords'),
      totalHeight = numberOfRecords * TR_HEIGHT, // 全体の高さ
      offsetHeight = offset * TR_HEIGHT, // オフセット量
      displayHeight = rowCount * TR_HEIGHT, // 表示領域
      displayRate = displayHeight / totalHeight;
    let barHeight = Math.ceil(displayHeight * displayRate);
    barHeight = barHeight < MIN_HEIGHT ? MIN_HEIGHT : barHeight;
    const availableHeight = displayHeight - barHeight * 0,
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
    this.timeoutId = window.setTimeout(
      this.release.bind(this),
      RELEASE_DURATION
    );
    this.elm.classList.add('-dragging');
  }

  release() {
    this.elm.classList.remove('-dragging');
  }

  setupMouseDrag() {
    let isDragging = false;
    let dragStartY = 0;
    let dragStartTop = 0;

    this.bar.style.cursor = 'grab';

    this.bar.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isDragging = true;
      dragStartY = e.clientY;
      dragStartTop = parseInt(this.bar.style.top) || 0;
      this.bar.style.cursor = 'grabbing';
      this.elm.classList.add('-dragging');
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();

      const deltaY = e.clientY - dragStartY;
      const newTop = dragStartTop + deltaY;

      // Apply containment (keep within parent element)
      const maxTop = this.elm.offsetHeight - this.bar.offsetHeight;
      const constrainedTop = Math.max(0, Math.min(newTop, maxTop));

      this.bar.style.top = `${constrainedTop}px`;

      // Simulate drag processing
      const mockEvent = { position: { top: constrainedTop } };
      this.drag(null, mockEvent);
    });

    document.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      this.bar.style.cursor = 'grab';
      this.prepareRelease();
    });
  }

  setupTouchEvents() {
    // Touch event setup
    this.bar.addEventListener('touchstart', this.handleTouchStart.bind(this), {
      passive: false,
    });
    this.bar.addEventListener('touchmove', this.handleTouchMove.bind(this), {
      passive: false,
    });
    this.bar.addEventListener('touchend', this.handleTouchEnd.bind(this), {
      passive: false,
    });
  }

  handleTouchStart(e) {
    e.preventDefault();
    this.isDragging = true;
    this.touchStartY = e.touches[0].clientY;
    this.touchStartTop = parseInt(this.bar.style.top) || 0;
    this.elm.classList.add('-dragging');
    this.elm.classList.add('-active');
  }

  handleTouchMove(e) {
    if (!this.isDragging) return;
    e.preventDefault();

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - this.touchStartY;
    const newTop = this.touchStartTop + deltaY;

    // Simulate drag processing
    const mockEvent = { position: { top: newTop } };
    this.drag(null, mockEvent);
  }

  handleTouchEnd(e) {
    if (!this.isDragging) return;
    e.preventDefault();
    this.isDragging = false;
    this.prepareRelease();
    this.elm.classList.remove('-active'); // Added: Remove active state when drag ends
  }
}
