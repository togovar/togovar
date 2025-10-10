import { storeManager } from '../../../store/StoreManager';
import { ConditionValueEditor } from './ConditionValueEditor.ts';
import { createEl } from '../../../utils/dom/createEl';
import '../../../components/ConditionItemValueView';

const OPTIONS = [
  '',
  ...[...Array(22)].map((_, index) => String(index + 1)),
  'X',
  'Y',
  'MT',
];

export class ConditionValueEditorLocation extends ConditionValueEditor {
  /**
   * @param {ConditionValues} valuesView
   * @param {ConditionItemView} conditionView
   */
  constructor(valuesView, conditionView) {
    super(valuesView, conditionView);

    // HTML
    const row1 = createEl('div', {
      class: 'row',
      children: [
        createEl('label', {
          children: [
            (this._checkboxInput = createEl('input', {
              attrs: {
                type: 'checkbox',
                name: 'range-or-position',
                value: 'single_position',
              },
            })),
            ' Single position',
          ],
        }),
      ],
    });

    const row2 = createEl('div', {
      class: 'row',
      children: [
        createEl('label', {
          class: 'chromosome',
          children: [
            createEl('span', { class: 'label', text: 'Chr.' }),
            createEl('span', {
              class: 'form',
              children: [
                (this._chr = createEl('select', {
                  children: OPTIONS.map((value) =>
                    createEl('option', { attrs: { value }, text: value })
                  ),
                })),
              ],
            }),
            createEl('span', { class: 'label', text: ':' }),
          ],
        }),
        createEl('label', {
          class: 'position',
          children: [
            (this._rangeInputView = createEl('span', {
              class: ['form', 'range-inputs-view'],
              dataset: { type: 'region' },
              children: [
                (this._start = createEl('input', {
                  class: 'start',
                  attrs: { type: 'number', min: '1' },
                })),
                createEl('span', { class: 'line' }),
                (this._end = createEl('input', {
                  class: 'end',
                  attrs: { type: 'number', min: '1' },
                })),
              ],
            })),
          ],
        }),
      ],
    });

    this.createSectionEl('location-editor-view', [
      createEl('header', { text: `Set ${this.conditionType}` }),
      createEl('div', { class: 'body', children: [row1, row2] }),
    ]);

    // references
    const inputs = [this._start, this._end];
    this._isWhole = false;

    // events
    this._checkboxInput.addEventListener('change', (e) => {
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
    // no-op for now (we rebuild from conditionItemValueViews when needed)
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
    const vv = this.conditionItemValueViews?.[0];
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
    const vv = this.conditionItemValueViews[0];
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
      this.removeValueView();
    }

    // validation → enable/disable OK button via host
    this.conditionValues.update(this.isValid);
  }
}
