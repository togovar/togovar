import { createEl } from '../../../utils/dom/createEl';
import { ConditionValueEditor } from './ConditionValueEditor';
import { ADVANCED_CONDITIONS } from '../../../global';
import type ConditionValues from '../ConditionValues';
import type { ConditionItemView } from '../ConditionItemView';
import type { ConditionItemValueView } from '../../../components/ConditionItemValueView';

/**
 * Editor for flat enumeration conditions (e.g., Variant type).
 * It renders a list of checkboxes and syncs them with <condition-item-value-view> elements.
 *
 * Assumptions:
 * - `ADVANCED_CONDITIONS[this.conditionType]` is a flat enumeration definition
 *   (i.e., `values` is an array of {value, label}).
 * - Clinical significance (with mgend/clinvar split) should use a different editor class.
 */
export class ConditionValueEditorCheckboxes extends ConditionValueEditor {
  private _checkboxes: HTMLInputElement[] = [];
  private _lastValues: string[] = [];

  constructor(
    conditionValues: ConditionValues,
    conditionView: ConditionItemView
  ) {
    super(conditionValues, conditionView);

    // Read the master definition for this condition type and assert it is flat.
    const master = ADVANCED_CONDITIONS.type;
    if (!master) {
      throw new Error('type condition not found');
    }

    // Build HTML (template string kept for brevity; safe because values are static text)
    this.createSectionEl('checkboxes-editor-view', () => [
      // <header>Select {type}</header>
      createEl('header', { text: `Select ${this.conditionType}` }),

      // buttons
      createEl('div', {
        class: 'buttons',
        children: [
          createEl('button', {
            class: ['button-view', '-weak'],
            text: 'Select all',
          }),
          createEl('button', {
            class: ['button-view', '-weak'],
            text: 'Clear all',
          }),
        ],
      }),

      // <ul class="checkboxes body"> ...items... </ul>
      createEl('ul', {
        class: ['checkboxes', 'body'],
        children: master.values.map((item) =>
          createEl('li', {
            dataset: { value: item.value },
            children: [
              createEl('label', {
                children: [
                  createEl('input', {
                    attrs: { type: 'checkbox' },
                    domProps: { value: item.value }, // value property
                    dataset: { label: item.label }, // data-label
                  }),
                  ' ',
                  item.label,
                ],
              }),
            ],
          })
        ),
      }),
    ]);

    // Cache references
    this._checkboxes = Array.from(
      this.sectionEl.querySelectorAll<HTMLInputElement>(
        ':scope > ul > li > label > input[type="checkbox"]'
      )
    );

    // Wire events
    this._checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', () => this._update());
    });

    this.sectionEl
      .querySelectorAll<HTMLButtonElement>(':scope > .buttons > button')
      .forEach((button, index) => {
        button.addEventListener('click', () => {
          // index: 0 => Select all, 1 => Clear all
          const checked = index === 0;
          this._checkboxes.forEach((cb) => (cb.checked = checked));
          this._update();
        });
      });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────────
  /** Save current values so they can be restored on cancel. */
  keepLastValues(): void {
    const views = Array.from(
      this.valuesContainerEl.querySelectorAll<ConditionItemValueView>(
        ':scope > condition-item-value-view'
      )
    );
    this._lastValues = views.map((v) => v.value);
    console.log('keepLastValues', this._lastValues);
  }

  /** Restore checkbox states to the last confirmed values. */
  restore(): void {
    this._checkboxes.forEach((checkbox) => {
      checkbox.checked = this._lastValues.includes(checkbox.value);
    });
    this._update();
  }

  /** Whether the current state is valid (at least one option checked). */
  get isValid(): boolean {
    return this._checkboxes.some((checkbox) => checkbox.checked);
  }

  /**
   * Sync the checked state into <condition-item-value-view> list and
   * update the parent editor's OK button enabled state.
   */
  private _update(): void {
    // Reflect checkbox checks into value views
    this._checkboxes.forEach((checkbox) => {
      const label = checkbox.dataset.label ?? checkbox.value; // guard against undefined
      if (checkbox.checked) {
        this.addValueView(checkbox.value, label);
      } else {
        this._removeValueView(checkbox.value);
      }
    });

    // Validation: enable/disable OK based on current validity
    this.conditionValues.update(this.isValid);
  }
}
