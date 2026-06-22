import { CONDITION_TYPE, type ConditionTypeValue } from '../../definition';
import type { RestoredConditionValue, SignificanceSource } from '../../types';
import type { ConditionItemValueView } from './ConditionItemValueView';
import type { FrequencyCountValueView } from './FrequencyCountValueView';
import type { PredictionValueView } from './ConditionPathogenicityPredictionSearch/PredictionValueView';

/**
 * URLから復元した条件値を values-container へ注入するクラス。
 * ConditionItemView のビュー状態管理（編集モード・relation・モーダル）とは独立して、
 * 値の復元ロジックだけを担う。
 */
export class ConditionItemHydrator {
  /** URL復元時の値注入ロジックを ConditionItemView の状態管理から分離し、単体で再利用できるようにするため。 */
  constructor(
    private readonly conditionType: ConditionTypeValue,
    private readonly valuesContainerEl: HTMLDivElement
  ) {}

  /** URL復元値から values-container を再構築し、Shadow DOM 内の frequency/prediction も updateComplete 待ちで確実に注入するため。 */
  async hydrate(values: RestoredConditionValue[]): Promise<void> {
    this.valuesContainerEl.replaceChildren();
    for (const value of values) {
      const valueView = this._createValueView(value);
      this._appendValueView(valueView, value);
      await this._hydrateFrequency(valueView, value);
      await this._hydratePrediction(valueView, value);
    }
  }

  /** 要素生成の責務を hydrate から切り出し、各プロパティ設定の見通しをよくするため。 */
  private _createValueView(
    value: RestoredConditionValue
  ): ConditionItemValueView {
    const valueView = document.createElement(
      'condition-item-value-view'
    ) as ConditionItemValueView;
    valueView.conditionType = this.conditionType;
    valueView.value = value.value;
    valueView.label = value.label;
    valueView.deleteButton = this.conditionType === CONDITION_TYPE.variant_id;
    return valueView;
  }

  /** significance のみ source ごとのラッパーへ振り分ける分岐を hydrate から分離するため。 */
  private _appendValueView(
    valueView: ConditionItemValueView,
    value: RestoredConditionValue
  ): void {
    if (this.conditionType === CONDITION_TYPE.significance && value.source) {
      this._getSignificanceContainer(value.source).append(valueView);
      return;
    }
    this.valuesContainerEl.append(valueView);
  }

  /**
   * 同一 source の値を1つのラッパー要素にまとめて表示するため、既存ラッパーを再利用し、なければ生成する。
   * ラベル（MGeND / ClinVar）もここで付与し、_appendValueView を単純に保つ。
   */
  private _getSignificanceContainer(source: SignificanceSource): HTMLElement {
    const wrapperClass = `${source}-wrapper`;
    const conditionWrapperClass = `${source}-condition-wrapper`;

    const existing = this.valuesContainerEl.querySelector<HTMLElement>(
      `.${wrapperClass} > .${conditionWrapperClass}`
    );
    if (existing) return existing;

    const outer = document.createElement('div');
    outer.classList.add(wrapperClass);

    const label = document.createElement('span');
    label.classList.add(source);
    label.textContent = source === 'mgend' ? 'MGeND' : 'ClinVar';

    const container = document.createElement('div');
    container.classList.add(conditionWrapperClass);

    outer.append(label, container);
    this.valuesContainerEl.append(outer);
    return container;
  }

  /**
   * frequency値をLit要素へ注入する。
   * updateComplete を待たないとshadowRootが未構築で要素が見つからない。
   */
  private async _hydrateFrequency(
    valueView: ConditionItemValueView,
    value: RestoredConditionValue
  ): Promise<void> {
    if (!value.frequency) return;

    await valueView.updateComplete;
    const frequencyValueView =
      valueView.shadowRoot?.querySelector<FrequencyCountValueView>(
        'frequency-count-value-view'
      );
    if (!frequencyValueView) return;

    const frequency = value.frequency;
    frequencyValueView.setValues(
      frequency.conditionType,
      frequency.mode,
      frequency.from,
      frequency.to,
      frequency.invert,
      frequency.filtered
    );
  }

  /**
   * prediction値をLit要素へ注入する。
   * 2段階のupdateComplete待機が必要。
   *
   * await の間にスライダーの初回レンダリングイベントが valueView の label/value を
   * 上書きすることがあるため、setValues 後に再設定して正しい値を保証する。
   */
  private async _hydratePrediction(
    valueView: ConditionItemValueView,
    value: RestoredConditionValue
  ): Promise<void> {
    if (!value.prediction) return;

    await valueView.updateComplete;
    const predictionValueView =
      valueView.shadowRoot?.querySelector<PredictionValueView>(
        'prediction-value-view'
      );
    if (!predictionValueView) return;

    await predictionValueView.updateComplete;

    const prediction = value.prediction;
    predictionValueView.setValues(
      prediction.dataset,
      prediction.values,
      prediction.inequalitySigns,
      prediction.includeUnassigned,
      prediction.includeUnknown
    );

    // スライダーの初回レンダリングイベントが上書きした場合に備えて再設定する。
    valueView.value = value.value;
    valueView.label = value.label;
  }
}
