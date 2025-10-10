import { storeManager } from '../../../store/StoreManager';
import { ConditionValueEditor } from './ConditionValueEditor';
import { createEl } from '../../../utils/dom/createEl';
import type ConditionValues from '../ConditionValues';
import type { ConditionItemView } from '../ConditionItemView';
import '../../../components/ConditionItemValueView';

const OPTIONS = [
  '',
  ...[...Array(22)].map((_, index) => String(index + 1)),
  'X',
  'Y',
  'MT',
];

export class ConditionValueEditorLocation extends ConditionValueEditor {
  private _checkboxInputEl!: HTMLInputElement;
  private _chrEl!: HTMLSelectElement;
  private _startEl!: HTMLInputElement;
  private _endEl!: HTMLInputElement;
  private _rangeInputView!: HTMLSpanElement;
  private _karyotype: unknown;
  private _isWhole: boolean = false;

  constructor(
    conditionValues: ConditionValues,
    conditionItemView: ConditionItemView
  ) {
    super(conditionValues, conditionItemView);

    // HTML
    const row1 = createEl('div', {
      class: 'row',
      children: [
        createEl('label', {
          children: [
            (this._checkboxInputEl = createEl('input', {
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
                (this._chrEl = createEl('select', {
                  children: OPTIONS.map((value) =>
                    createEl('option', { attrs: { value }, text: value })
                  ),
                })),
              ],
            }),
          ],
        }),
        createEl('span', { class: 'label', text: ':' }),
        createEl('label', {
          class: 'position',
          children: [
            (this._rangeInputView = createEl('span', {
              class: ['form', 'range-inputs-view'],
              dataset: { type: 'region' },
              children: [
                (this._startEl = createEl('input', {
                  class: 'start',
                  attrs: { type: 'number', min: '1' },
                })),
                createEl('span', { class: 'line' }),
                (this._endEl = createEl('input', {
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
    const inputs = [this._startEl, this._endEl];
    this._isWhole = false;

    // events
    this._checkboxInputEl.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      this._rangeInputView.dataset.type = target.checked
        ? 'single_position'
        : 'region';
      this._update();
    });

    [this._chrEl, ...inputs].forEach((input) => {
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
    if (this._chrEl.value === '') return false;

    switch (this._rangeInputView.dataset.type) {
      case 'region':
        return (
          this._startEl.value !== '' &&
          this._endEl.value !== '' &&
          +this._startEl.value < +this._endEl.value
        );
      case 'single_position':
        return this._startEl.value !== '';
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
  private _prefillFromViews() {
    const vv = this.conditionItemValueViews?.[0];
    const raw = vv?.value || vv?.label;
    if (!raw || typeof raw !== 'string') return;

    // e.g. "7:123-456" or "X:999"
    const m = /^([^:]+):(\d+)(?:-(\d+))?$/.exec(raw.trim());
    if (!m) return;

    const [, chr, start, end] = m;
    // set fields
    if (OPTIONS.includes(chr)) this._chrEl.value = chr;
    this._startEl.value = start;
    if (end) {
      this._rangeInputView.dataset.type = 'region';
      this._endEl.value = end;
    } else {
      this._rangeInputView.dataset.type = 'single_position';
      this._endEl.value = '';
    }
  }

  /**
   * Recompute UI → value view(s), apply validation, and notify host.
   */
  private _update(e?: Event) {
    // update range max by chromosome change
    // Safely narrow _karyotype to expected shape
    const k = this._karyotype as
      | { reference?: string; chromosomes?: unknown }
      | undefined;
    const ref = k?.reference;
    let endMax: number | undefined = undefined;
    if (ref && k?.chromosomes && typeof k.chromosomes === 'object') {
      const chrEntry = (k.chromosomes as Record<string, unknown>)[
        this._chrEl.value
      ];
      if (
        chrEntry &&
        typeof chrEntry === 'object' &&
        'region' in (chrEntry as Record<string, unknown>)
      ) {
        const regionObj = (chrEntry as Record<string, unknown>).region as
          | unknown
          | undefined;
        if (
          regionObj &&
          typeof regionObj === 'object' &&
          (regionObj as Record<string, unknown>)[ref] &&
          Array.isArray((regionObj as Record<string, unknown>)[ref])
        ) {
          endMax = (
            (regionObj as Record<string, unknown>)[ref] as unknown[]
          )[1] as number | undefined;
        }
      }
    }

    if (e?.target === this._chrEl && endMax) {
      // reset input constraints when chromosome changes
      this._startEl.max = String(endMax);
      this._endEl.max = String(endMax);

      if (this._isWhole) this._endEl.value = String(endMax);

      if (this._startEl.value === '') {
        this._startEl.value = '1';
        this._isWhole = true;
      } else if (+this._startEl.value > endMax) {
        this._startEl.value = String(endMax);
      }

      if (this._endEl.value === '') {
        this._endEl.value = String(endMax);
        this._isWhole = true;
      } else if (+this._endEl.value > endMax) {
        this._endEl.value = String(endMax);
        this._isWhole = true;
      }
    } else if (endMax && +this._endEl.value < endMax) {
      this._isWhole = false;
    }

    // rebuild value view
    const vv = this.conditionItemValueViews[0];
    if (this.isValid) {
      const asRegion = this._rangeInputView.dataset.type === 'region';
      const value = `${this._chrEl.value}:${this._startEl.value}${
        asRegion ? `-${this._endEl.value}` : ''
      }`;

      if (vv) {
        vv.label = value;
        vv.value = value;
      } else {
        this.addValueView(value, value, true);
      }
    } else {
      // remove any existing value view
      this.removeValueView('');
    }

    // validation → enable/disable OK button via host
    this.conditionValues.update(this.isValid);
  }
}
