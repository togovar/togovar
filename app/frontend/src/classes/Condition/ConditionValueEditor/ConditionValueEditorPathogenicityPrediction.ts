import { ConditionValueEditor } from './ConditionValueEditor';
import '../../../components/ConditionPathogenicityPredictionSearch/TabView.js';
import '../../../components/ConditionPathogenicityPredictionSearch/PredictionRangeSliderView.js';
import type {
  PredictionKey,
  PredictionLabel,
} from '../../../components/ConditionPathogenicityPredictionSearch/PredictionDatasets';
import { PREDICTIONS } from '../../../components/ConditionPathogenicityPredictionSearch/PredictionDatasets';
import type ConditionValues from '../ConditionValues.js';
import type { ConditionItemView } from '../ConditionItemView';
import type { ConditionItemValueView } from '../../../components/ConditionItemValueView';
import type { PredictionValueView } from '../../../components/ConditionPathogenicityPredictionSearch/PredictionValueView';

/**
 * Pathogenicity prediction editing screen
 * This class manages the UI and state for editing pathogenicity predictions.
 */
class ConditionValueEditorPathogenicityPrediction extends ConditionValueEditor {
  private _dataset!: PredictionKey; // selected dataset (e.g., alphamissense, sift, polyphen)
  private _label!: PredictionLabel; // selected label (e.g., AlphaMissense, SIFT, PolyPhen)
  private _values!: Array<number>; // max-min values (0〜1)
  private _inequalitySigns!: Array<string>; // max-min inequality signs (gte, gt, lte, lt)
  private _unassignedChecks!: Array<string>; // unassigned checks (e.g., unassigned, unknown)
  private _tabsContainer!: HTMLDivElement; // container for tabs
  private _lastState!: {
    dataset: string;
    label: string;
    values: Array<number>;
    inequalitySigns: Array<string>;
    unassignedChecks: Array<string>;
  }; // last selected values and states

  /**
   * @param {ConditionValues} valuesView
   * @param {ConditionItemView} conditionView
   */
  constructor(valuesView: ConditionValues, conditionView: ConditionItemView) {
    super(valuesView, conditionView);
    this._initializeDefaultValues();
    this._initializeUI();
    this._initializeEvents();
  }

  // ========================================
  // State Management
  // ========================================

  /**
   * Retain values when switching to the edit screen.
   * This method saves the current state of the values to allow restoration if needed.
   */
  keepLastValues() {
    this._valuesElement
      .querySelectorAll(':scope > condition-item-value-view')
      .forEach((view) => {
        const conditionValues = (
          view.shadowRoot?.querySelector('prediction-value-view') as any
        )?.conditionValues;
        if (conditionValues) {
          const { dataset, label, values, inequalitySigns, unassignedChecks } =
            conditionValues;
          this._lastState = {
            dataset,
            label,
            values,
            inequalitySigns,
            unassignedChecks,
          };
        }
      });
  }

  /**
   * Restore the last selected values if editing is canceled.
   * This method re-applies the previously saved state to the UI.
   */
  restore() {
    const { dataset, label, values, inequalitySigns, unassignedChecks } =
      this._lastState;
    this._addPredictionValueView(
      dataset,
      label,
      values,
      inequalitySigns,
      unassignedChecks
    );
  }

  // ========================================
  // Initialization
  // ========================================

  // Initialize default values
  private _initializeDefaultValues() {
    this._dataset = 'alphamissense';
    this._label = 'AlphaMissense';
    this._values = [0, 1];
    this._inequalitySigns = ['gte', 'lte'];
    this._unassignedChecks = [];
    this._lastState = {
      dataset: this._dataset,
      label: this._label,
      values: [...this._values],
      inequalitySigns: [...this._inequalitySigns],
      unassignedChecks: [...this._unassignedChecks],
    };
  }

  // Initialize UI elements
  private _initializeUI() {
    this._createElement(
      'pathogenicity-editor-view',
      `<header>Select prediction</header><div class="body" />`
    );
    this._tabsContainer = this.sectionEl?.querySelector('.body')!;
    this._createTabView();
  }

  // Initialize event listeners
  private _initializeEvents() {
    this._tabsContainer.addEventListener(
      'set-prediction-values',
      (e: Event) => {
        const customEvent = e as CustomEvent;
        this._updateValuesAndSigns(customEvent.detail);
      }
    );

    this._tabsContainer.addEventListener('switch-tab', (e: Event) => {
      const customEvent = e as CustomEvent;
      this._switchTab(customEvent.detail);
    });
  }

  // ========================================
  // State Management
  // ========================================

  /** Update UI and values when a tab is switched */
  private _switchTab(detail: any) {
    this._dataset = detail.dataset;
    this._label = PREDICTIONS[this._dataset].label;
    this._updateValuesAndSigns(detail);
  }

  /** Update internal values and render */
  private _update() {
    this._addPredictionValueView(
      this._dataset,
      this._label,
      this._values,
      this._inequalitySigns,
      this._unassignedChecks
    );
    this._valuesView.update(this._validate());
  }

  /** Update values and inequality signs */
  private _updateValuesAndSigns(detail: any) {
    this._values = [detail.values[0], detail.values[1]];
    this._inequalitySigns = [
      detail.inequalitySigns[0],
      detail.inequalitySigns[1],
    ];
    this._unassignedChecks = detail.unassignedChecks;
    this._update();
  }

  // ========================================
  // UI Rendering
  // ========================================

  /** Add or update the value view */
  private _addPredictionValueView(
    dataset: string,
    label: string,
    values: Array<number>,
    inequalitySigns: Array<string>,
    unassignedChecks: Array<string>
  ) {
    let valueView = this._valuesElement.querySelector(
      'condition-item-value-view'
    ) as ConditionItemValueView;

    if (!valueView) {
      valueView = document.createElement('condition-item-value-view');
      valueView.conditionType = this._conditionType;
      this._valuesElement.append(valueView);
    }

    valueView.value = dataset;
    valueView.label = label;

    this._valuesElement
      .querySelectorAll(':scope > condition-item-value-view')
      .forEach((view) => {
        const predictionValueView = view.shadowRoot?.querySelector(
          'prediction-value-view'
        ) as PredictionValueView;
        if (predictionValueView) {
          predictionValueView.predictionDataset = dataset;
          predictionValueView.values = values;
          predictionValueView.inequalitySigns = inequalitySigns;
          predictionValueView.unassignedChecks = unassignedChecks;
        }
      });
  }

  /** Create tab view */
  private _createTabView() {
    const tabView = document.createElement('tab-view') as any;
    tabView.datasets = PREDICTIONS;
    this._tabsContainer.appendChild(tabView);
  }

  // ========================================
  // Validation
  // ========================================
  /** Validate if the values are valid */
  private _validate(): boolean {
    return this._values.filter((item) => !Number.isNaN(item)).length === 2;
  }

  // Accessor
  /** You can press the OK button if there are two valid values */
  get isValid() {
    return this._values.filter((item) => !Number.isNaN(item)).length === 2;
  }
}

export default ConditionValueEditorPathogenicityPrediction;
