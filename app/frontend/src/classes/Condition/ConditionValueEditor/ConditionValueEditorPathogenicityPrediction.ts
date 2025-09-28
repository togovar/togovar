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
import type { Inequality } from '../../../types';
import type TabView from '../../../components/ConditionPathogenicityPredictionSearch/TabView.js';

type PredictionChangeDetail = {
  dataset: PredictionKey;
  values: [number, number];
  inequalitySigns: [Inequality, Inequality];
  unassignedChecks?: string[];
  includeUnassigned?: boolean;
  includeUnknown?: boolean;
};

/**
 * Pathogenicity prediction editing screen
 * This class manages the UI and state for editing pathogenicity predictions.
 */
class ConditionValueEditorPathogenicityPrediction extends ConditionValueEditor {
  private _dataset: PredictionKey = 'alphamissense'; // selected dataset (e.g., alphamissense, sift, polyphen)
  private _label: PredictionLabel = 'AlphaMissense'; // selected label (e.g., AlphaMissense, SIFT, PolyPhen)
  private _values: [number, number] = [0, 1]; // max-min values (0〜1)
  private _inequalitySigns: [Inequality, Inequality] = ['gte', 'lte']; // max-min inequality signs (gte, gt, lte, lt)
  private _includeUnassigned = false;
  private _includeUnknown = false; // polyphen用
  private _tabsContainer!: HTMLDivElement; // container for tabs
  private _lastState: {
    dataset: PredictionKey;
    label: PredictionLabel;
    values: [number, number];
    inequalitySigns: [Inequality, Inequality];
    includeUnassigned: boolean;
    includeUnknown: boolean;
  } = {
    dataset: 'alphamissense',
    label: 'AlphaMissense',
    values: [0, 1],
    inequalitySigns: ['gte', 'lte'],
    includeUnassigned: false,
    includeUnknown: false,
  };

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
        const pv = view.shadowRoot?.querySelector<PredictionValueView>(
          'prediction-value-view'
        );
        const cv = pv?.conditionValues;
        if (cv) {
          const {
            dataset,
            label,
            values,
            inequalitySigns,
            includeUnassigned,
            includeUnknown,
          } = cv;
          this._lastState = {
            dataset,
            label,
            values,
            inequalitySigns,
            includeUnassigned,
            includeUnknown,
          };
        }
      });
  }

  /**
   * Restore the last selected values if editing is canceled.
   * This method re-applies the previously saved state to the UI.
   */
  restore() {
    const {
      dataset,
      label,
      values,
      inequalitySigns,
      includeUnassigned,
      includeUnknown,
    } = this._lastState;
    this._addPredictionValueView(
      dataset,
      label,
      values,
      inequalitySigns,
      includeUnassigned,
      includeUnknown
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
    this._includeUnassigned = false;
    this._includeUnknown = false;
    this._lastState = {
      dataset: this._dataset,
      label: this._label,
      values: [...this._values],
      inequalitySigns: [...this._inequalitySigns],
      includeUnassigned: false,
      includeUnknown: false,
    };
  }

  // Initialize UI elements
  private _initializeUI() {
    this._createElement(
      'pathogenicity-editor-view',
      `<header>Select prediction</header><div class="body"></div>`
    );
    this._tabsContainer =
      this.sectionEl.querySelector<HTMLDivElement>('.body')!;
    this._createTabView();
  }

  // Initialize event listeners
  private _initializeEvents() {
    this._tabsContainer.addEventListener(
      'set-prediction-values',
      (e: Event) => {
        const detail = (e as CustomEvent<PredictionChangeDetail>).detail;
        this._updateValuesAndSigns(detail);
      }
    );
    this._tabsContainer.addEventListener('switch-tab', (e: Event) => {
      const detail = (e as CustomEvent<PredictionChangeDetail>).detail;
      this._switchTab(detail);
    });
  }

  // ========================================
  // State Management
  // ========================================

  /** Update UI and values when a tab is switched */
  private _switchTab(detail: PredictionChangeDetail) {
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
      this._includeUnassigned,
      this._includeUnknown
    );
    // ConditionValues に update がある環境のみ呼ぶ
    if (hasUpdate(this._valuesView)) {
      this._valuesView.update(this._validate());
    }
  }

  // 受け取った detail を反映（boolean 正規化を含む）
  private _updateValuesAndSigns(detail: PredictionChangeDetail) {
    this._values = [detail.values[0], detail.values[1]];
    this._inequalitySigns = [
      detail.inequalitySigns[0],
      detail.inequalitySigns[1],
    ];
    const flags = normalizeIncludeFlags(detail);
    this._includeUnassigned = flags.includeUnassigned;
    this._includeUnknown = flags.includeUnknown;
    this._update();
  }

  // ========================================
  // UI Rendering
  // ========================================

  /** Add or update the value view */
  private _addPredictionValueView(
    dataset: PredictionKey,
    label: PredictionLabel,
    values: [number, number],
    inequalitySigns: [Inequality, Inequality],
    includeUnassigned = false,
    includeUnknown = false
  ) {
    // 既存 valueView を取得 or 作成
    let valueView = this._valuesElement.querySelector<ConditionItemValueView>(
      'condition-item-value-view'
    );
    if (!valueView) {
      valueView = document.createElement(
        'condition-item-value-view'
      ) as ConditionItemValueView;
      valueView.conditionType = this._conditionType;
      this._valuesElement.append(valueView);
    }

    valueView.value = dataset;
    valueView.label = label;

    // 内部の prediction-value-view に値を流し込む
    this._valuesElement
      .querySelectorAll<ConditionItemValueView>(
        ':scope > condition-item-value-view'
      )
      .forEach((view) => {
        const pv = view.shadowRoot?.querySelector<PredictionValueView>(
          'prediction-value-view'
        );
        if (pv) {
          pv.setValues(
            dataset,
            values,
            inequalitySigns,
            includeUnassigned,
            includeUnknown
          );
        }
      });
  }

  /** Create tab view */
  private _createTabView() {
    const tabView = document.createElement('tab-view') as TabView;
    tabView.datasets = PREDICTIONS;
    this._tabsContainer.appendChild(tabView);
  }

  // ========================================
  // Validation
  // ========================================
  /** Validate if the values are valid */
  private _validate(): boolean {
    return Number.isFinite(this._values[0]) && Number.isFinite(this._values[1]);
  }

  // Accessor
  /** You can press the OK button if there are two valid values */
  get isValid() {
    return this._validate();
  }
}

export default ConditionValueEditorPathogenicityPrediction;

function hasUpdate(x: unknown): x is { update(valid: boolean): void } {
  return typeof (x as Record<string, unknown>)?.update === 'function';
}
function normalizeIncludeFlags(d: PredictionChangeDetail) {
  const arr = d.unassignedChecks ?? [];
  return {
    includeUnassigned: d.includeUnassigned ?? arr.includes('unassigned'),
    includeUnknown: d.includeUnknown ?? arr.includes('unknown'),
  };
}
