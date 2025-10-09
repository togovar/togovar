import { ConditionValueEditor } from './ConditionValueEditor';
import type ConditionValues from '../ConditionValues';
import type { ConditionItemView } from '../ConditionItemView';
import type { ConditionItemValueView } from '../../../components/ConditionItemValueView';
import SearchField from '../../../components/SearchField/SearchField';
import { createEl } from '../../../utils/dom/createEl';

/** Variant ID editing screen */
export class ConditionValueEditorVariantID extends ConditionValueEditor {
  private _searchFieldView!: SearchField;
  private _lastValueViews: ConditionItemValueView[] = [];

  constructor(valuesView: ConditionValues, conditionView: ConditionItemView) {
    super(valuesView, conditionView);

    // HTML
    this.createSectionEl('text-field-editor-view', () => [
      createEl('header', { text: `Search for ${this.conditionType}` }),
      createEl('div', { class: 'body' }),
    ]);

    // Initialize search field with proper type casting
    this._searchFieldView = new SearchField(
      this.bodyEl as HTMLDivElement,
      'rs1489251879'
    );

    this._searchFieldView.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const id = this._searchFieldView.value;

        if (this._searchFieldView.value.trim().length > 0) {
          this.addValueView(id, id, false, true);
          this._update();
          this._searchFieldView.value = '';
        }
      }
    });

    this.valuesContainerEl?.addEventListener(
      'delete-condition-item',
      (e: Event) => {
        const customEvent = e as CustomEvent<string>;
        this._handleDeleteValue(customEvent);
      }
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────────

  /** Retain value views when changing to edit screen */
  keepLastValues(): void {
    this._lastValueViews = this.conditionItemValueViews;
  }

  /** Restore the value views before editing if cancel button is pressed */
  restore(): void {
    this._updateValueViews(this._lastValueViews);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ───────────────────────────────────────────────────────────────────────────

  /** Update validation state for the OK button */
  private _update(): void {
    this.conditionValues.update(this.isValid);
  }

  /** Delete value and _update when value's button.delete is pressed on edit screen */
  private _handleDeleteValue(e: CustomEvent<string>): void {
    e.stopPropagation();
    this._removeValueView(e.detail);
    this._update();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Validation
  // ───────────────────────────────────────────────────────────────────────────

  /** Returns true if there are value nodes in div.values */
  get isValid(): boolean {
    return this.valuesContainerEl.hasChildNodes();
  }
}
