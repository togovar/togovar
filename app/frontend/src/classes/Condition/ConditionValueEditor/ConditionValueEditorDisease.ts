import { ConditionValueEditor } from './ConditionValueEditor';
import type ConditionValues from '../ConditionValues';
import type { ConditionItemView } from '../ConditionItemView';
import { ConditionDiseaseSearch } from '../../../components/ConditionDiseaseSearch/ConditionDiseaseSearch.js';
import { createEl } from '../../../utils/dom/createEl';

interface DiseaseData {
  id: string | null;
  label: string | null;
}

export class ConditionValueEditorDisease extends ConditionValueEditor {
  private _data!: DiseaseData;
  private _lastValues!: DiseaseData;
  private _conditionElem!: ConditionDiseaseSearch;
  constructor(valuesView: ConditionValues, conditionView: ConditionItemView) {
    super(valuesView, conditionView);

    this._data = { id: null, label: null };

    // HTML
    this._createElement('text-field-editor-view', () => [
      createEl('header', { text: `Select ${this._conditionType}` }),
      createEl('div', { class: 'body' }),
    ]);

    this._conditionElem =
      this.bodyEl.querySelector('condition-disease-search') ||
      new ConditionDiseaseSearch(this.bodyEl);

    this._conditionElem.addEventListener('disease-selected', (e: Event) => {
      e.stopPropagation();
      const customEvent = e as CustomEvent<{ id: string; label: string }>;
      const { id, label } = customEvent.detail;

      if (id) {
        this._data = { id, label };

        this._addValueView(this._data.id!, this._data.label!, true);

        this._update();
      } else {
        if (this._data.id) {
          this._removeValueView(this._data.id);
        }
        this._data = { id: null, label: null };
        this._update();
      }
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────────
  keepLastValues(): void {
    this._lastValues = { ...this._data };
  }

  restore(): void {
    this._data = { ...this._lastValues };
    this._update();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ───────────────────────────────────────────────────────────────────────────
  private _update(): void {
    this._valuesView.update(this.isValid);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Validation
  // ───────────────────────────────────────────────────────────────────────────
  get isValid(): boolean {
    return !!this._data.id;
  }
}
