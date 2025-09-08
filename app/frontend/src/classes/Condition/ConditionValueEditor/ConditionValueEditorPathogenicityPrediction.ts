import ConditionValueEditor from './ConditionValueEditor.js';
import '../../../components/ConditionPathogenicityPredictionSearch/TabView.js';
import '../../../components/ConditionPathogenicityPredictionSearch/PredictionRangeSliderView.js';
import { PREDICTIONS } from '../../../components/ConditionPathogenicityPredictionSearch/PredictionDatasets.js';
import ConditionValues from '../ConditionValues.js';
import ConditionItemView from '../ConditionItemView';

interface ConditionItemValueViewElement extends HTMLElement {
  label?: string;
  conditionType?: string;
  value?: string;
  deleteButton?: boolean;
}

interface PredictionValueViewElement extends HTMLElement {
  predictionDataset: string;
  values: Array<number>;
  inequalitySigns: Array<string>;
  unassignedChecks: Array<string>;
}

/** Pathogenicity prediction editing screen */
class ConditionValueEditorPathogenicityPrediction extends ConditionValueEditor {
  private _dataset!: string; // selected dataset (e.g., alphamissense, sift, polyphen)
  private _label!: string; // selected label (e.g., AlphaMissense, SIFT, PolyPhen)
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
    this._tabsContainer = this._el?.querySelector('.body')!;
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

  // Public methods
  /** Retain values when switching to edit screen */
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

  /** Restore the last selected values if editing is canceled */
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

  // Private methods
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
    ) as ConditionItemValueViewElement;

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
        ) as PredictionValueViewElement;
        if (predictionValueView) {
          predictionValueView.predictionDataset = dataset;
          predictionValueView.values = values;
          predictionValueView.inequalitySigns = inequalitySigns;
          predictionValueView.unassignedChecks = unassignedChecks;
        }
      });
  }

  /** Validate if the values are valid */
  private _validate(): boolean {
    return this._values.filter((item) => !Number.isNaN(item)).length === 2;
  }

  /** Create tab view */
  private _createTabView() {
    const tabView = document.createElement('tab-view') as any;
    tabView.datasets = PREDICTIONS;
    this._tabsContainer.appendChild(tabView);
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

  // Accessor
  /** You can press the OK button if there are two valid values */
  get isValid() {
    return this._values.filter((item) => !Number.isNaN(item)).length === 2;
  }
}

export default ConditionValueEditorPathogenicityPrediction;
