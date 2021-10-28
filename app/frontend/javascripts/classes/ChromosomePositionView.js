export default class ChromosomePositionView {

  constructor(container) {
    container.innerHTML = `
    <span class="chromosome-position">
      <span class="chromosome"></span><span class="taking">-</span><span class="coordinate"></span>
    </span>`;
    const root = container.querySelector(':scope > .chromosome-position');
    this._chr = root.querySelector('.chromosome');
    this._pos = root.querySelector('.coordinate');
  }

  setValues(chr, pos) {
    this._chr.textContent = chr;
    this._pos.textContent = pos;
  }

}