import { ConditionValueEditor } from './ConditionValueEditor';
import type ConditionValues from '../ConditionValues';
import type { ConditionItemView } from '../ConditionItemView';
import SearchFieldWithSuggestions from '../../../components/SearchField/suggestions/SearchFieldWithSuggestions';
import { API_URL } from '../../../global';
import { createEl } from '../../../utils/dom/createEl';

/** Gene Search editing screen */
export class ConditionValueEditorGene extends ConditionValueEditor {
  private _searchFieldView!: SearchFieldWithSuggestions;
  private _value: string = '';
  private _label: string = '';
  private _lastValue: string = '';
  private _lastLabel: string = '';

  constructor(valuesView: ConditionValues, conditionView: ConditionItemView) {
    super(valuesView, conditionView);

    // HTML
    this.createSectionEl('text-field-editor-view', () => [
      createEl('header', { text: `Search for ${this._conditionType}` }),
      createEl('div', { class: 'body' }),
    ]);

    /** @property {HTMLDivElement} _searchFieldView - CustomElement */
    this._searchFieldView = new SearchFieldWithSuggestions(
      'BRCA2',
      `${API_URL}/api/search/${this._conditionType}`,
      'term',
      this.bodyEl,
      {
        valueMappings: {
          valueKey: 'id',
          labelKey: 'symbol',
          aliasOfKey: 'alias_of',
        },
      }
    );

    this._searchFieldView.addEventListener(
      'new-suggestion-selected',
      (e: Event) => {
        const customEvent = e as CustomEvent<{ id: number; label: string }>;
        this._handleSuggestSelect(customEvent);
      }
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────────
  /** Retain value when changing to edit screen */
  keepLastValues(): void {
    const valueView = this._valuesElement.querySelector(
      'condition-item-value-view'
    ) as Element & { value?: string; label?: string };

    this._lastValue = valueView?.value || '';
    this._lastLabel = valueView?.label || '';
  }

  /** Restore the value before editing if cancel button is pressed */
  restore(): void {
    this.addValueView(this._lastValue, this._lastLabel, true);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ───────────────────────────────────────────────────────────────────────────
  /** Add condition-item-value-view with selected suggestion data */
  private _handleSuggestSelect = (
    e: CustomEvent<{ id: number; label: string }>
  ): void => {
    this._value = String(e.detail.id);
    this._label = e.detail.label;
    this.addValueView(this._value, this._label, true, false);

    // Change whether okbutton can be pressed
    this._valuesView.update(this.isValid);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Validation
  // ───────────────────────────────────────────────────────────────────────────
  /** You can press the ok button if there is condition-item-value-view */
  get isValid(): boolean {
    return this._valueViews.length > 0;
  }
}
