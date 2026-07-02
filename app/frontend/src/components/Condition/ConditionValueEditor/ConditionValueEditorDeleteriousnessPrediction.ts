import { ConditionValueEditor } from './ConditionValueEditor';
import '../ConditionDeleteriousnessPredictionSearch/TabView';
import '../ConditionDeleteriousnessPredictionSearch/PredictionRangeSliderView';
import type {
  PredictionKey,
  PredictionLabel,
} from '../ConditionDeleteriousnessPredictionSearch/PredictionDatasets';
import { PREDICTIONS } from '../ConditionDeleteriousnessPredictionSearch/PredictionDatasets';
import type ConditionValues from '../ConditionValues';
import type { ConditionItemView } from '../ConditionItemView';
import type { ConditionItemValueView } from '../ConditionItemValueView';
import type { PredictionValueView } from '../ConditionDeleteriousnessPredictionSearch/PredictionValueView';
import type { Inequality, PredictionChangeDetail } from '../../../types';
import type { TabView } from '../ConditionDeleteriousnessPredictionSearch/TabView';

const DEFAULT_PREDICTION_KEY: PredictionKey = 'cadd_phred';
const DEFAULT_PREDICTION = PREDICTIONS[DEFAULT_PREDICTION_KEY];

/**
 * Deleteriousness prediction 条件のエディタ。
 * tab-view でデータセット（AlphaMissense/SIFT/PolyPhen 等）を切り替え、
 * スコア範囲と不等号を設定して prediction-value-view へ反映する。
 */
export class ConditionValueEditorDeleteriousnessPrediction extends ConditionValueEditor {
  private _dataset: PredictionKey = DEFAULT_PREDICTION_KEY;
  private _label: PredictionLabel = DEFAULT_PREDICTION.label;
  private _values: [number, number] = [
    DEFAULT_PREDICTION.scoreMin,
    DEFAULT_PREDICTION.scoreMax,
  ];
  private _inequalitySigns: [Inequality, Inequality] = ['gte', 'lte'];
  private _includeUnassigned = false;
  private _includeUnknown = false;
  private _tabsContainer!: HTMLDivElement;
  private _lastState: {
    dataset: PredictionKey;
    label: PredictionLabel;
    values: [number, number];
    inequalitySigns: [Inequality, Inequality];
    includeUnassigned: boolean;
    includeUnknown: boolean;
  } = {
    dataset: DEFAULT_PREDICTION_KEY,
    label: DEFAULT_PREDICTION.label,
    values: [DEFAULT_PREDICTION.scoreMin, DEFAULT_PREDICTION.scoreMax],
    inequalitySigns: ['gte', 'lte'],
    includeUnassigned: false,
    includeUnknown: false,
  };

  /**
   * デフォルト値初期化・UI生成・イベント登録を順に実行する。
   * bodyEl を確定させてからイベントを登録するため、初期化を3段階に分離する。
   */
  constructor(valuesView: ConditionValues, conditionView: ConditionItemView) {
    super(valuesView, conditionView);
    this._initializeDefaultValues();
    this._initializeUI();
    this._initializeEvents();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Cancel時に戻す基準として、shadow DOM内の prediction-value-view の現在値を保存する。
   * shadow DOM を経由するため、value-view が未更新のタイミングでも正確な値が取れる。
   * 同時に tab-view のアクティブタブを現在の dataset に合わせて復元する。
   * URL復元後に edit ボタンを押したとき、最初のタブ（CADD）ではなく保存された条件のタブが開くようにするため。
   */
  keepLastValues() {
    this.valuesContainerEl
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
          const tabView = this._tabsContainer.querySelector<TabView>('tab-view');
          tabView?.restoreTab(dataset, values, inequalitySigns, includeUnassigned, includeUnknown);
        }
      });
  }

  /** 保存済みスナップショットの値でvalue-viewを再描画して編集前の状態に戻す。 */
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

  // ───────────────────────────────────────────────────────────────────────────
  // Initialization
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * デフォルト値と _lastState の初期化をコンストラクタから分離する。
   * constructor が肥大化しないよう責務を分割するため。
   */
  private _initializeDefaultValues() {
    this._dataset = DEFAULT_PREDICTION_KEY;
    this._label = DEFAULT_PREDICTION.label;
    this._values = [DEFAULT_PREDICTION.scoreMin, DEFAULT_PREDICTION.scoreMax];
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

  /**
   * セクションDOMを生成してtab-viewを配置する。
   * bodyEl は _initializeEvents の前に確定させる必要があるためここで行う。
   */
  private _initializeUI() {
    this.createSectionEl(
      'deleteriousness-prediction-editor-view',
      `<header class="section-header">Select score</header><div class="section-content"></div>`
    );
    this._tabsContainer =
      this.sectionEl.querySelector<HTMLDivElement>('.section-content')!;
    this._createTabView();
  }

  /**
   * set-prediction-values と switch-tab の2イベントを _tabsContainer に登録する。
   * 非アクティブなタブのスライダーも初回描画時にイベントを発火するため、
   * アクティブな _dataset との一致を確認してから処理する。
   */
  private _initializeEvents() {
    this._tabsContainer.addEventListener(
      'set-prediction-values',
      (e: Event) => {
        const detail = (e as CustomEvent<PredictionChangeDetail>).detail;
        if (detail.dataset !== this._dataset) return;
        this._updateValuesAndSigns(detail);
      }
    );
    this._tabsContainer.addEventListener('switch-tab', (e: Event) => {
      const detail = (e as CustomEvent<PredictionChangeDetail>).detail;
      this._switchTab(detail);
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // State Management
  // ───────────────────────────────────────────────────────────────────────────

  /** タブ切り替え時に _dataset と _label を更新して値・不等号を同期する。 */
  private _switchTab(detail: PredictionChangeDetail) {
    this._dataset = detail.dataset;
    this._label = PREDICTIONS[this._dataset].label;
    this._updateValuesAndSigns(detail);
  }

  /**
   * 現在の値でvalue-viewを更新してOKボタンの活性を通知する。
   * conditionValues.update が存在する環境のみ呼ぶことで、テスト環境との互換性を保つ。
   */
  private _update() {
    this._addPredictionValueView(
      this._dataset,
      this._label,
      this._values,
      this._inequalitySigns,
      this._includeUnassigned,
      this._includeUnknown
    );
    if (hasUpdate(this.conditionValues)) {
      this.conditionValues.update(this._validate());
    }
  }

  /**
   * detail の値・不等号・フラグを内部状態へ正規化して反映しUIを更新する。
   * boolean 正規化を一箇所にまとめることで、各フラグの型変換ミスを防ぐ。
   */
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

  // ───────────────────────────────────────────────────────────────────────────
  // UI Rendering
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * value-viewを1件に保ちながら prediction-value-view へ値を流し込む。
   * 値の変更のたびに呼ぶことで常に最新状態を表示するため、毎回 setValues を呼ぶ。
   */
  private _addPredictionValueView(
    dataset: PredictionKey,
    label: PredictionLabel,
    values: [number, number],
    inequalitySigns: [Inequality, Inequality],
    includeUnassigned = false,
    includeUnknown = false
  ) {
    let valueView =
      this.valuesContainerEl.querySelector<ConditionItemValueView>(
        'condition-item-value-view'
      );
    if (!valueView) {
      valueView = document.createElement(
        'condition-item-value-view'
      ) as ConditionItemValueView;
      valueView.conditionType = this.conditionType;
      this.valuesContainerEl.append(valueView);
    }

    valueView.value = dataset;
    valueView.label = label;

    this.valuesContainerEl
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

  /** tab-view カスタム要素を生成して _tabsContainer へ追加する。 */
  private _createTabView() {
    const tabView = document.createElement('tab-view') as TabView;
    tabView.datasets = PREDICTIONS;
    this._tabsContainer.appendChild(tabView);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Validation
  // ───────────────────────────────────────────────────────────────────────────

  /** from/to の両値が有限数であれば有効とする。NaN や Infinity を除外するため。 */
  private _validate(): boolean {
    return Number.isFinite(this._values[0]) && Number.isFinite(this._values[1]);
  }

  /** _validate の結果をOKボタン制御に公開する。 */
  get isValid() {
    return this._validate();
  }
}

/** conditionValues に update メソッドが存在するか確認する型ガード。 */
function hasUpdate(x: unknown): x is { update(valid: boolean): void } {
  return typeof (x as Record<string, unknown>)?.update === 'function';
}

/** detail から includeUnassigned/includeUnknown を正規化して返す。 */
function normalizeIncludeFlags(d: PredictionChangeDetail) {
  const arr = d.unassignedChecks ?? [];
  return {
    includeUnassigned: d.includeUnassigned ?? arr.includes('unassigned'),
    includeUnknown: d.includeUnknown ?? arr.includes('unknown'),
  };
}
