import { storeManager } from '../../../store/StoreManager';
import { ConditionValueEditor } from './ConditionValueEditor.ts';
import '../../../components/ConditionItemValueView';

const OPTIONS = [
  '',
  ...[...Array(22)].map((_, index) => String(index + 1)),
  'X',
  'Y',
  'MT',
];

export default class ConditionValueEditorLocation extends ConditionValueEditor {
  /**
   * @param {ConditionValues} valuesView
   * @param {ConditionItemView} conditionView
   */
  constructor(valuesView, conditionView) {
    super(valuesView, conditionView);

    // HTML
    this.createSectionEl(
      'location-editor-view',
      `
    <header>Set location</header>
    <div class="body">
      <div class="row">
        <label>
          <input type="checkbox" name="range-or-position" value="single_position"> Single position
        </label>
      </div>
      <div class="row">
        <label class="chromosome">
          <span class="label">Chr.</span>
          <span class="form">
            <select>
              ${OPTIONS.map(
                (value) => `<option value="${value}">${value}</option>`
              ).join('')}
            </select>
          </span>
          <span class="label">&nbsp;:&nbsp;&nbsp;</span>
        </label>
        <label class="position">
          <span class="form range-inputs-view" data-type="region">
            <input class="start" type="number" min="1">
            <span class="line"></span>
            <input class="end" type="number" min="1">
          </span>
        </label>
      </div>
    </div>`
    );

    // references
    const rows = this.sectionEl.querySelectorAll(':scope > .body > .row');
    this._chr = rows[1].querySelector(':scope > .chromosome > .form > select');
    this._rangeInputView = rows[1].querySelector(
      ':scope > .position > .range-inputs-view'
    );
    const inputs = Array.from(
      this._rangeInputView.querySelectorAll(':scope > input')
    );
    this._start = inputs.find((input) => input.classList.contains('start'));
    this._end = inputs.find((input) => input.classList.contains('end'));
    this._isWhole = false;

    // events
    this.sectionEl
      .querySelector(':scope > .body > .row:nth-child(1) > label > input')
      .addEventListener('change', (e) => {
        this._rangeInputView.dataset.type = e.target.checked
          ? 'single_position'
          : 'region';
        this._update();
      });

    [this._chr, ...inputs].forEach((input) => {
      input.addEventListener('change', (e) => {
        this._update(e);
      });
    });

    // karyotype data (end coordinate lookup)
    this._karyotype = storeManager.getData('karyotype');

    // Prefill from existing value view if present (e.g., reopening editor)
    this._prefillFromViews();
    // Ensure UI reflects current state
    this._update();
  }

  // ─────────────────────────────────────────────────────
  // public
  // ─────────────────────────────────────────────────────

  keepLastValues() {
    // no-op for now (we rebuild from _valueViews when needed)
  }

  restore() {
    // Re-apply UI from current value views (if any)
    this._prefillFromViews();
    this._update();
  }

  search() {
    this._update();
  }

  get isValid() {
    if (this._chr.value === '') return false;

    switch (this._rangeInputView.dataset.type) {
      case 'region':
        return (
          this._start.value !== '' &&
          this._end.value !== '' &&
          +this._start.value < +this._end.value
        );
      case 'single_position':
        return this._start.value !== '';
      default:
        return false;
    }
  }

  // ─────────────────────────────────────────────────────
  // private
  // ─────────────────────────────────────────────────────

  /**
   * Read existing value view (if any) and prefill UI controls.
   * Expected format: "chr:start-end" or "chr:start"
   */
  _prefillFromViews() {
    const vv = this._valueViews?.[0];
    const raw = vv?.value || vv?.label;
    if (!raw || typeof raw !== 'string') return;

    // e.g. "7:123-456" or "X:999"
    const m = /^([^:]+):(\d+)(?:-(\d+))?$/.exec(raw.trim());
    if (!m) return;

    const [, chr, start, end] = m;
    // set fields
    if (OPTIONS.includes(chr)) this._chr.value = chr;
    this._start.value = start;
    if (end) {
      this._rangeInputView.dataset.type = 'region';
      this._end.value = end;
    } else {
      this._rangeInputView.dataset.type = 'single_position';
      this._end.value = '';
    }
  }

  /**
   * Recompute UI → value view(s), apply validation, and notify host.
   */
  _update(e) {
    // update range max by chromosome change
    const ref = this._karyotype?.reference;
    const endMax =
      ref &&
      this._karyotype?.chromosomes?.[this._chr.value]?.region?.[ref]?.[1];

    if (e?.target === this._chr && endMax) {
      // reset input constraints when chromosome changes
      this._start.max = endMax;
      this._end.max = endMax;

      if (this._isWhole) this._end.value = endMax;

      if (this._start.value === '') {
        this._start.value = 1;
        this._isWhole = true;
      } else if (+this._start.value > endMax) {
        this._start.value = endMax;
      }

      if (this._end.value === '') {
        this._end.value = endMax;
        this._isWhole = true;
      } else if (+this._end.value > endMax) {
        this._end.value = endMax;
        this._isWhole = true;
      }
    } else if (endMax && +this._end.value < endMax) {
      this._isWhole = false;
    }

    // rebuild value view
    const vv = this._valueViews[0];
    if (this.isValid) {
      const asRegion = this._rangeInputView.dataset.type === 'region';
      const value = `${this._chr.value}:${this._start.value}${
        asRegion ? `-${this._end.value}` : ''
      }`;

      if (vv) {
        vv.label = value;
        vv.value = value;
      } else {
        this.addValueView(value, value, true);
      }
    } else {
      this._removeValueView();
    }

    // validation → enable/disable OK button via host
    this._valuesView.update(this.isValid);
  }
}
