import { ConditionValueEditor } from './ConditionValueEditor';
import type ConditionValues from '../ConditionValues';
import type { ConditionItemView } from '../ConditionItemView';
import { ConditionDiseaseSearch } from '../../../components/ConditionDiseaseSearch/ConditionDiseaseSearch.js';
import { createEl } from '../../../utils/dom/createEl';

interface DiseaseData {
  id: string | null;
  label: string | null;
}

interface DiseaseSelectionEventDetail {
  id: string;
  label: string;
}

/** Disease Search editing screen */
export class ConditionValueEditorDisease extends ConditionValueEditor {
  private _data: DiseaseData = { id: null, label: null };
  private _lastValues: DiseaseData = { id: null, label: null };
  private _conditionElem!: ConditionDiseaseSearch;
  constructor(valuesView: ConditionValues, conditionView: ConditionItemView) {
    super(valuesView, conditionView);

    this._initializeElements();
    this._setupEventListeners();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Initialization
  // ───────────────────────────────────────────────────────────────────────────
  private _initializeElements(): void {
    this._createElement('text-field-editor-view', () => [
      createEl('header', { text: `Select ${this._conditionType}` }),
      createEl('div', { class: 'body' }),
    ]);

    this._conditionElem =
      this.bodyEl.querySelector('condition-disease-search') ||
      new ConditionDiseaseSearch(this.bodyEl);
  }

  private _setupEventListeners(): void {
    this._conditionElem.addEventListener('disease-selected', (e: Event) => {
      this._handleDiseaseSelection(e);
    });
  }

  private _handleDiseaseSelection(e: Event): void {
    e.stopPropagation();
    const customEvent = e as CustomEvent<DiseaseSelectionEventDetail>;
    const { id, label } = customEvent.detail;

    if (id) {
      this._selectDisease({ id, label });
    } else {
      this._clearSelection();
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────────
  keepLastValues(): void {
    this._lastValues = { ...this._data };
  }

  /** Restore the value before editing if cancel button is pressed */
  restore(): void {
    this._data = { ...this._lastValues };

    if (this._lastValues.id && this._lastValues.label) {
      this._addValueView(this._lastValues.id, this._lastValues.label, true);
    }

    this._update();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ───────────────────────────────────────────────────────────────────────────
  private _selectDisease(diseaseData: DiseaseData): void {
    this._data = { ...diseaseData };

    if (this._data.id && this._data.label) {
      this._addValueView(this._data.id, this._data.label, true);
    }

    this._update();
  }

  private _clearSelection(): void {
    if (this._data.id) {
      this._removeValueView(this._data.id);
    }
    this._data = { id: null, label: null };
    this._update();
  }

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
