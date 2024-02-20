import ConditionValueEditor from './ConditionValueEditor.js';
import '../components/ConditionPathogenicityPredictionSearch/TabView.js';
import '../components/ConditionPathogenicityPredictionSearch/PredictionRangeSliderView.js';
import { PREDICTIONS } from '../components/ConditionPathogenicityPredictionSearch/PredictionDatasets.js';

/** Pathogenicity prediction editing screen */
class ConditionValueEditorPathogenicityPrediction extends ConditionValueEditor {
  /**
   * @param {ConditionValues} valuesView
   * @param {ConditionItemView} conditionView */
  constructor(valuesView, conditionView) {
    super(valuesView, conditionView);
    /** @property {string} _dataset - selected dataset(alphamissense, sift, polyphen) */
    this._dataset = 'alphamissense';
    /** @property {string} _label -  selected label(AlphaMissense, SIFT, PolyPhen) */
    this._label = 'AlphaMissense';
    /** @property {array} _values - max min values(0〜１) */
    this._values = [0, 1];
    /** @property {array} _inequalitySigns - max min inequalitySigns(gte, gt, lte, lt) */
    this._inequalitySigns = ['gte', 'lte'];
    /** @property {array} _unassignedChecks - unassignedChecks(unassigned, unknown) */
    this._unassignedChecks = [];

    // HTML
    this._createElement(
      'pathogenicity-editor-view',
      `<header>Select prediction</header>
      <div class="body" />`
    );
    this._tabsContainer = this._el.querySelector('.body');
    this.#createTabView();

    // Event
    this._tabsContainer.addEventListener('set-prediction-values', (e) => {
      this.#updateValuesAndSigns(e.detail);
    });
    this._tabsContainer.addEventListener('switch-tab', (e) => {
      this._dataset = e.detail.dataset;
      this._label = PREDICTIONS[this._dataset].label;
      this.#updateValuesAndSigns(e.detail);
    });
  }

  // public methods
  /** Retain value when changing to edit screen
   * See {@link ConditionValues} startToEditCondition */
  keepLastValues() {
    this._valuesElement
      .querySelectorAll(':scope > condition-item-value-view')
      .forEach((view) => {
        const { dataset, label, values, inequalitySigns, unassignedChecks } =
          view.shadowRoot.querySelector(
            'prediction-value-view'
          ).conditionValues;
        this._lastDataset = dataset;
        this._lastLabel = label;
        this._lastValues = values;
        this._lastInequalitySigns = inequalitySigns;
        this._lastUnassignedChecks = unassignedChecks;
      });
  }

  /** If the cancel button is pressed when isFirstTime is false, restore the value before editing
   *  See {@link ConditionValues} _clickCancelButton */
  restore() {
    this.#addPredictionValueView(
      this._lastDataset,
      this._lastLabel,
      this._lastValues,
      this._lastInequalitySigns,
      this._lastUnassignedChecks
    );
  }

  // private methods
  /** Change whether okbutton can be pressed, Add condition-item-value-view
   * @private */
  #update() {
    this.#addPredictionValueView(
      this._dataset,
      this._label,
      this._values,
      this._inequalitySigns,
      this._unassignedChecks
    );
    this._valuesView.update(this.#validate());
  }

  /** Add or update the value view
   * @protected
   * @param {string} dataset
   * @param {string} label
   * @param {Array} values
   * @param {Array} inequalitySigns
   * @param {Array} unassignedChecks
   * @returns {HTMLDivElement} - condition-item-value-view element. */
  #addPredictionValueView(
    dataset,
    label,
    values,
    inequalitySigns,
    unassignedChecks
  ) {
    let valueView = this._valuesElement.querySelector(
      `condition-item-value-view`
    );

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
        const predictionValueView = view.shadowRoot.querySelector(
          'prediction-value-view'
        );
        if (!predictionValueView) return;

        predictionValueView.setValues(
          dataset,
          values,
          inequalitySigns,
          unassignedChecks
        );
      });

    return valueView;
  }

  /** Whether you can press the ok button
   * @private
   * @returns {boolean} */
  #validate() {
    return this.isValid;
  }

  /** Create tab view
   * @private */
  #createTabView() {
    const tabView = document.createElement('tab-view');
    tabView.datasets = PREDICTIONS;
    this._tabsContainer.appendChild(tabView);
  }

  /** Update values and signs
   * @private */
  #updateValuesAndSigns(detail) {
    this._values = [detail.values[0], detail.values[1]];
    this._inequalitySigns = [
      detail.inequalitySigns[0],
      detail.inequalitySigns[1],
    ];
    this._unassignedChecks = detail.unassignedChecks;
    this.#update();
  }

  //accessor
  /** You can press the ok button if there are two valid values
   * @type {boolean} */
  get isValid() {
    return this._values.filter((item) => !Number.isNaN(item)).length === 2;
  }
}

export default ConditionValueEditorPathogenicityPrediction;
