import ConditionValueEditor from './ConditionValueEditor.js';
import '../components/ConditionPathogenicityPredictionSearch/TabView.js';
import '../components/ConditionPathogenicityPredictionSearch/PredictionRangeSliderView.js';
import { PREDICTIONS } from '../components/ConditionPathogenicityPredictionSearch/PredictionDatasets.js';
import ConditionValues from './ConditionValues.js';
import ConditionItemView from './ConditionItemView.js';

interface ConditionItemValueViewElement extends HTMLElement {
  label?: string;
  conditionType?: string;
  value?: string;
  deleteButton?: boolean;
}

interface PredictionValueViewElement extends HTMLElement {
  setValues(
    dataset: string,
    values: Array<number>,
    inequalitySigns: Array<string>,
    unassignedChecks: Array<string>
  ): void;
}

/** Pathogenicity prediction editing screen */
class ConditionValueEditorPathogenicityPrediction extends ConditionValueEditor {
  #dataset: string; // selected dataset (e.g., alphamissense, sift, polyphen)
  #label: string; // selected label (e.g., AlphaMissense, SIFT, PolyPhen)
  #values: Array<number>; // max-min values (0〜1)
  #inequalitySigns: Array<string>; // max-min inequality signs (gte, gt, lte, lt)
  #unassignedChecks: Array<string>; // unassigned checks (e.g., unassigned, unknown)
  #tabsContainer: HTMLDivElement; // container for tabs
  #lastState: {
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
    this.#initializeDefaultValues();
    this.#initializeUI();
    this.#initializeEvents();
  }

  // Initialize default values
  #initializeDefaultValues() {
    this.#dataset = 'alphamissense';
    this.#label = 'AlphaMissense';
    this.#values = [0, 1];
    this.#inequalitySigns = ['gte', 'lte'];
    this.#unassignedChecks = [];
    this.#lastState = {
      dataset: this.#dataset,
      label: this.#label,
      values: [...this.#values],
      inequalitySigns: [...this.#inequalitySigns],
      unassignedChecks: [...this.#unassignedChecks],
    };
  }

  // Initialize UI elements
  #initializeUI() {
    this._createElement(
      'pathogenicity-editor-view',
      `<header>Select prediction</header><div class="body" />`
    );
    this.#tabsContainer = this._el.querySelector('.body')!;
    this.#createTabView();
  }

  // Initialize event listeners
  #initializeEvents() {
    this.#tabsContainer.addEventListener(
      'set-prediction-values',
      (e: Event) => {
        const customEvent = e as CustomEvent;
        this.#updateValuesAndSigns(customEvent.detail);
      }
    );

    this.#tabsContainer.addEventListener('switch-tab', (e: Event) => {
      const customEvent = e as CustomEvent;
      this.#switchTab(customEvent.detail);
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
          this.#lastState = {
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
      this.#lastState;
    this.#addPredictionValueView(
      dataset,
      label,
      values,
      inequalitySigns,
      unassignedChecks
    );
  }

  // Private methods
  /** Update UI and values when a tab is switched */
  #switchTab(detail: any) {
    this.#dataset = detail.dataset;
    this.#label = PREDICTIONS[this.#dataset].label;
    this.#updateValuesAndSigns(detail);
  }

  /** Update internal values and render */
  #update() {
    this.#addPredictionValueView(
      this.#dataset,
      this.#label,
      this.#values,
      this.#inequalitySigns,
      this.#unassignedChecks
    );
    this._valuesView.update(this.#validate());
  }

  /** Add or update the value view */
  #addPredictionValueView(
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
          predictionValueView.setValues(
            dataset,
            values,
            inequalitySigns,
            unassignedChecks
          );
        }
      });
  }

  /** Validate if the values are valid */
  #validate(): boolean {
    return this.#values.filter((item) => !Number.isNaN(item)).length === 2;
  }

  /** Create tab view */
  #createTabView() {
    const tabView = document.createElement('tab-view') as any;
    tabView.datasets = PREDICTIONS;
    this.#tabsContainer.appendChild(tabView);
  }

  /** Update values and inequality signs */
  #updateValuesAndSigns(detail: any) {
    this.#values = [detail.values[0], detail.values[1]];
    this.#inequalitySigns = [
      detail.inequalitySigns[0],
      detail.inequalitySigns[1],
    ];
    this.#unassignedChecks = detail.unassignedChecks;
    this.#update();
  }

  // Accessor
  /** You can press the OK button if there are two valid values */
  get isValid() {
    return this.#values.filter((item) => !Number.isNaN(item)).length === 2;
  }
}

export default ConditionValueEditorPathogenicityPrediction;
