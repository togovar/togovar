import { createEl } from '../../../utils/dom/createEl';
import { ConditionValueEditor } from './ConditionValueEditor';
import { ADVANCED_CONDITIONS } from '../../../global';
import type ConditionValues from '../ConditionValues';
import type { ConditionItemView } from '../ConditionItemView';
import type { ConditionItemValueView } from '../../../components/ConditionItemValueView';
import type {
  EnumerationItem,
  MutableSignificanceValues,
  SignificanceSource,
} from '../../../types';

const LABELS = {
  selectHeader: (t: string) => `Select ${t}`,
  selectAll: 'Select all',
  clearAll: 'Clear all',
  mgend: 'MGeND',
  clinvar: 'Clinvar',
} as const;

/**
 * Editor for the "Clinical significance" condition.
 * - Renders MGeND and ClinVar buckets with checkboxes
 * - Maintains mutable selection state
 * - Keeps last confirmed values for restore()
 */
export class ConditionValueEditorClinicalSignificance extends ConditionValueEditor {
  private _checkboxes: HTMLInputElement[] = [];
  private _values: MutableSignificanceValues = { mgend: [], clinvar: [] };
  private _lastValues: MutableSignificanceValues = { mgend: [], clinvar: [] };

  /** Cached UL containers (filled after initial render) */
  private _mgendUl?: HTMLUListElement;
  private _clinvarUl?: HTMLUListElement;

  /**
   * @param valuesView Parent view orchestrating editors
   * @param conditionView Condition row (provides container & meta)
   */
  constructor(valuesView: ConditionValues, conditionView: ConditionItemView) {
    super(valuesView, conditionView);

    // Typed config from JSON (significance is always enumeration with 2 buckets)
    const master = ADVANCED_CONDITIONS.significance;
    if (!master) {
      throw new Error('Missing condition definition: significance');
    }

    // Build section skeleton
    this._createElement('clinical-significance-view', () => [
      createEl('header', { text: LABELS.selectHeader(this._conditionType) }),
      createEl('div', {
        class: 'buttons',
        children: [
          createEl('button', {
            class: ['button-view', '-weak'],
            text: LABELS.selectAll,
          }),
          createEl('button', {
            class: ['button-view', '-weak'],
            text: LABELS.clearAll,
          }),
        ],
      }),
      createEl('div', {
        class: ['dataset-title', 'mgend'],
        text: LABELS.mgend,
      }),
      (this._mgendUl = createEl('ul', {
        class: ['checkboxes', 'body'],
        dataset: { type: 'clinical-significance', source: 'mgend' },
      })),
      createEl('hr'),
      createEl('div', {
        class: ['dataset-title', 'clinvar'],
        text: LABELS.clinvar,
      }),
      (this._clinvarUl = createEl('ul', {
        class: ['checkboxes', 'body'],
        dataset: { type: 'clinical-significance', source: 'clinvar' },
      })),
    ]);

    // Populate checkboxes (accept readonly input, create mutable UI)
    const mgendVals = this._filterValues(master.values.mgend, 'mgend');
    const clinvarVals = this._filterValues(master.values.clinvar, 'clinvar');

    this._mgendUl!.append(
      ...this._generateCheckboxListNodes(mgendVals, 'mgend')
    );
    this._clinvarUl!.append(
      ...this._generateCheckboxListNodes(clinvarVals, 'clinvar')
    );

    // Cache all checkbox refs once
    this._checkboxes = Array.from(
      this.sectionEl.querySelectorAll<HTMLInputElement>(
        ':scope ul[data-type="clinical-significance"] input[type="checkbox"]'
      )
    );

    this._attachCheckboxEventsDelegated();
    this._attachButtonEvents();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────────

  /** Capture current rendered value-views as "last confirmed" values. */
  keepLastValues(): void {
    const mgendNodes =
      this._valuesElement.querySelectorAll<ConditionItemValueView>(
        ':scope > .mgend-wrapper > .mgend-condition-wrapper > condition-item-value-view'
      );
    const clinvarNodes =
      this._valuesElement.querySelectorAll<ConditionItemValueView>(
        ':scope > .clinvar-wrapper > .clinvar-condition-wrapper > condition-item-value-view'
      );

    this._lastValues = {
      mgend: Array.from(mgendNodes, (v) => ({
        value: v.value,
        label: v.label,
      })),
      clinvar: Array.from(clinvarNodes, (v) => ({
        value: v.value,
        label: v.label,
      })),
    };
  }

  /** Restore checkboxes from the last confirmed values, then re-render. */
  restore(): void {
    const has = (src: SignificanceSource, val: string) =>
      this._lastValues[src].some((x) => x.value === val);

    for (const cb of this._checkboxes) {
      const src = (cb.dataset.source as SignificanceSource) || 'mgend';
      cb.checked = has(src, cb.value);
    }
    this._update();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DOM build helpers
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Create LI nodes for one bucket.
   * @param values Readonly source items from JSON
   * @param source Either "mgend" or "clinvar"
   */
  private _generateCheckboxListNodes(
    values: ReadonlyArray<EnumerationItem>,
    source: SignificanceSource
  ): HTMLLIElement[] {
    return values.map(({ value, label }) =>
      createEl('li', {
        dataset: { value, source },
        children: [
          createEl('label', {
            children: [
              createEl('input', {
                attrs: { type: 'checkbox' },
                dataset: { source, label },
                domProps: { value },
              }),
              createEl('span', {
                class: 'clinical-significance',
                dataset: { value },
              }),
              ' ',
              label,
            ],
          }),
        ],
      })
    );
  }

  /** Attach a single delegated change handler for all checkboxes. */
  private _attachCheckboxEventsDelegated(): void {
    this.sectionEl.addEventListener('change', (e) => {
      const t = e.target as Element | null;
      if (!t || !(t instanceof HTMLInputElement)) return;
      if (!t.matches('input[type="checkbox"]')) return;
      this._update();
    });
  }

  /** Wire "Select all" / "Clear all" buttons with a single handler. */
  private _attachButtonEvents(): void {
    const btns = this.sectionEl.querySelectorAll<HTMLButtonElement>(
      ':scope > .buttons > button'
    );
    btns.forEach((button, index) => {
      button.addEventListener('click', () => {
        const check = index === 0; // 0: select all, 1: clear all
        for (const cb of this._checkboxes) cb.checked = check;
        this._update();
      });
    });
  }

  /**
   * Filter master values into a mutable array for UI consumption.
   * @param values Source values (readonly, from JSON)
   * @param source MGeND or ClinVar
   */
  private _filterValues(
    values: ReadonlyArray<EnumerationItem>,
    source: SignificanceSource
  ): EnumerationItem[] {
    if (this._conditionType === 'significance' && source === 'clinvar') {
      return values.filter((v) => v.value !== 'NC'); // new mutable array
    }
    return Array.from(values); // mutable copy
  }

  // ───────────────────────────────────────────────────────────────────────────
  // State & rendering
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Recompute selection state from checkboxes and update the rendered chips.
   * Side-effects:
   * - Mutates `_values`
   * - Re-renders value views
   * - Notifies parent about validity
   */
  private _update(): void {
    // Rebuild `_values` from checkbox states
    this._values = { mgend: [], clinvar: [] };
    for (const cb of this._checkboxes) {
      if (!cb.checked) continue;
      const source = (cb.dataset.source as SignificanceSource) || 'mgend';
      const label = cb.dataset.label ?? cb.value;
      this._values[source].push({ value: cb.value, label });
    }

    // Re-render both sources
    this._renderSource('mgend', this._values.mgend);
    this._renderSource('clinvar', this._values.clinvar);

    // Update parent validity
    this._valuesView.update(this.isValid);
  }

  /**
   * Render one bucket (mgend/clinvar):
   * - If empty: remove wrapper group
   * - Else: ensure wrapper and replace all chips
   */
  private _renderSource(
    source: SignificanceSource,
    values: Array<EnumerationItem>
  ): void {
    if (values.length === 0) {
      this._removeConditionWrapper(source);
      return;
    }

    const wrapper = this._ensureWrapperExists(source);

    // Clear existing chips
    wrapper
      .querySelectorAll<ConditionItemValueView>('condition-item-value-view')
      .forEach((v) => v.remove());

    // Append chips
    for (const v of values) {
      const chip = document.createElement(
        'condition-item-value-view'
      ) as ConditionItemValueView;
      chip.conditionType = this._conditionType;
      chip.label = v.label;
      chip.value = v.value;
      wrapper.append(chip);
    }
  }

  /**
   * Ensure existence of the bucket wrapper:
   * <div class="{source}-wrapper">
   *   <span class="{source}">MGeND|Clinvar</span>
   *   <div class="{source}-condition-wrapper"></div>
   * </div>
   * @returns the inner "{source}-condition-wrapper" element
   */
  private _ensureWrapperExists(source: SignificanceSource): HTMLElement {
    const wrapperClass = `${source}-wrapper`;
    const conditionWrapperClass = `${source}-condition-wrapper`;

    // outer (parent of header and inner wrapper)
    const outer =
      this._valuesElement.querySelector<HTMLElement>(`.${wrapperClass}`) ??
      createEl('div', { class: wrapperClass });

    // If it's not in the DOM yet, append it.
    if (!outer.isConnected) {
      this._valuesElement.append(outer);
    }

    // inner wrapper
    const conditionWrapper =
      outer.querySelector<HTMLElement>(`.${conditionWrapperClass}`) ??
      createEl('div', { class: conditionWrapperClass });

    // When creating a new one, add it together with the label.
    if (!conditionWrapper.isConnected) {
      const label = createEl('span', {
        class: source,
        text: source === 'mgend' ? LABELS.mgend : LABELS.clinvar,
      });
      outer.append(label, conditionWrapper);
    }

    return conditionWrapper;
  }

  /**
   * Remove the entire wrapper group for one source.
   * This prevents an empty "Clinvar" or "MGeND" header from lingering.
   */
  private _removeConditionWrapper(source: SignificanceSource): void {
    const outer = this._valuesElement.querySelector<HTMLElement>(
      `.${source}-wrapper`
    );
    if (outer) outer.remove();
  }

  /** Editor validity: true if at least one checkbox is checked. */
  public get isValid(): boolean {
    return this._checkboxes.some((cb) => cb.checked);
  }
}
