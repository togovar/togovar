import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, state, query, queryAll } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { range } from 'lit/directives/range.js';
import { createGradientSlider } from './createGradientSlider';
import {
  type Threshold,
  type PredictionKey,
  type PredictionLabel,
  CADD_THRESHOLD,
  PREDICTIONS,
} from './PredictionDatasets';
import { setInequalitySign } from './setInequalitySign';
import Styles from '../../../../stylesheets/web-components/prediction-value-view.scss';
import type {
  ScoreOrUnassignedFor,
  PredictionQueryLocal,
  ScoreRange,
  Inequality,
} from '../../../types';

const SLIDER_CONFIG = {
  numberOfScales: 10,
  sliderWidth: 100,
} as const;

const makeLeaf = <K extends PredictionKey>(
  key: K,
  score: ScoreOrUnassignedFor<K>
) => ({ [key]: { score } }) as { [P in K]: { score: ScoreOrUnassignedFor<P> } };

@customElement('prediction-value-view')
export class PredictionValueView extends LitElement {
  static styles = [Styles];

  @state() private predictionKey: PredictionKey = 'cadd_phred';
  @state() private predictionLabel: PredictionLabel = 'CADD (PHRED score)';

  @state() private scoreValues: [number, number] = [0, 99];
  @state() private inequalitySigns: [Inequality, Inequality] = ['gte', 'lte'];

  @state() private includeUnassigned = false;
  @state() private includeUnknown = false; // polyphen のみ使用

  // グラデーション生成に使う閾値データ
  @state() private activeThreshold: Threshold = CADD_THRESHOLD;

  @query('.bar') private barEl!: HTMLDivElement;
  @queryAll('.inequality-sign')
  private inequalitySignEls!: NodeListOf<HTMLElement>;

  /** 外部（親コンポーネント）からスコア範囲・不等号・ラベル選択状態を一括で設定するため。 */
  setValues(
    predictionKey: PredictionKey,
    values: [number, number],
    inequalitySigns: [Inequality, Inequality],
    includeUnassigned: boolean,
    includeUnknown: boolean // polyphen のみ使用
  ): void {
    this.predictionKey = predictionKey;
    // 範囲外の値をクランプすることで表示数値とクエリの両方が scoreMin〜scoreMax に収まるようにするため
    const { scoreMin, scoreMax } = PREDICTIONS[predictionKey];
    this.scoreValues = [
      Math.max(scoreMin, Math.min(scoreMax, values[0])),
      Math.max(scoreMin, Math.min(scoreMax, values[1])),
    ];
    this.inequalitySigns = inequalitySigns;
    this.includeUnassigned = includeUnassigned;
    this.includeUnknown = includeUnknown;

    this.predictionLabel = PREDICTIONS[this.predictionKey].label;
    this.activeThreshold = PREDICTIONS[this.predictionKey].threshold;
  }

  /**
   * @state の変化ごとに呼ばれるため、setValues より先に呼ばれる firstUpdated では
   * なく updated でまとめて DOM 操作することで、未レンダリング時のクラッシュを防ぐ。
   */
  updated(): void {
    this.syncBarStyle();
    setInequalitySign(this.inequalitySignEls[0], this.inequalitySigns[0]);
    setInequalitySign(this.inequalitySignEls[1], this.inequalitySigns[1]);
  }

  /** スコア値と不等号の変更をバーの位置・グラデーションへ即時反映するため、値変更のたびに呼ぶ。 */
  private syncBarStyle(): void {
    this.barEl.style.left = this.valueToPercent(this.scoreValues[0]) + '%';
    this.barEl.style.right = 100 - this.valueToPercent(this.scoreValues[1]) + '%';
    const prediction = PREDICTIONS[this.predictionKey];
    this.barEl.style.backgroundImage = createGradientSlider(
      this.activeThreshold,
      this.barEl,
      SLIDER_CONFIG.sliderWidth,
      prediction.scoreMin,
      prediction.scoreMax
    );
  }

  render(): TemplateResult {
    return html`
      <div class="prediction-graph">
        <div class="bar"></div>
        <ul class="ruler">
          ${map(
            range(SLIDER_CONFIG.numberOfScales + 1),
            (i) =>
              html`<li
                class="scale"
                style="
                  left: calc(${(i * 100) /
                SLIDER_CONFIG.numberOfScales}% - ${i /
                SLIDER_CONFIG.numberOfScales}px)"
              ></li>`
          )}
        </ul>
      </div>
      <div class="range">
        <span class="from">${this.scoreValues[0]}</span>
        <span class="inequality-sign" data-inequality-sign="gte">&#8804;</span>
        <span class="text">${PREDICTIONS[this.predictionKey].scoreLabel}</span>
        <span class="inequality-sign" data-inequality-sign="lte">&#8804;</span>
        <span class="to">${this.scoreValues[1]}</span>
        <span class="text">
          ${[
            this.includeUnassigned && 'Unassigned',
            this.predictionKey === 'polyphen' && this.includeUnknown && 'Unknown',
          ]
            .filter((x): x is string => Boolean(x))
            .join(', ')}
        </span>
      </div>
    `;
  }

  /** 編集中のUI状態を外部コンポーネントが取得できるよう値をまとめて返すため。 */
  get conditionValues(): {
    dataset: PredictionKey;
    label: PredictionLabel;
    values: [number, number];
    inequalitySigns: [Inequality, Inequality];
    includeUnassigned: boolean;
    includeUnknown: boolean; // polyphen のみ使用
  } {
    return {
      dataset: this.predictionKey,
      label: this.predictionLabel,
      values: this.scoreValues,
      inequalitySigns: this.inequalitySigns,
      includeUnassigned: this.includeUnassigned,
      includeUnknown: this.includeUnknown,
    };
  }

  /** スコア範囲とラベル選択の組み合わせをAPIクエリ形式（単一LeafまたはOR）に変換するため。 */
  get queryValue(): PredictionQueryLocal {
    const key = this.predictionKey;

    // ラベル未選択の場合はスコア範囲のみをクエリにする
    if (this.isNoLabelSelected()) {
      return makeLeaf(
        key,
        this.toScoreRange(this.scoreValues, this.inequalitySigns)
      );
    }

    // from === to かつ非包含（gt/lt）の場合、スコア範囲が空集合になるためラベルのみのクエリにする
    const [from, to] = this.scoreValues;
    const [leftSign, rightSign] = this.inequalitySigns;
    const isEmptyRange = from === to && (leftSign === 'gt' || rightSign === 'lt');
    if (isEmptyRange) {
      return makeLeaf(key, this.labelScoreFor(key));
    }

    // ラベル選択あり + 有効なスコア範囲の場合は OR 結合でクエリを生成する
    const labelLeaf = makeLeaf(key, this.labelScoreFor(key));
    const rangeLeaf = makeLeaf(
      key,
      this.toScoreRange(this.scoreValues, this.inequalitySigns)
    );
    return { or: [labelLeaf, rangeLeaf] };
  }

  /** [from, to] と不等号の組み合わせを API の ScoreRange 形式に変換するため。 */
  private toScoreRange(
    [from, to]: [number, number],
    [leftSign, rightSign]: [Inequality, Inequality]
  ): ScoreRange {
    if (leftSign === 'gte' && rightSign === 'lte') return { gte: from, lte: to };
    if (leftSign === 'gte' && rightSign === 'lt') return { gte: from, lt: to };
    if (leftSign === 'gt' && rightSign === 'lte') return { gt: from, lte: to };
    if (leftSign === 'gt' && rightSign === 'lt') return { gt: from, lt: to };

    // 片側のみ不等号が有効な場合
    if (leftSign === 'gte') return { gte: from };
    if (leftSign === 'gt') return { gt: from };
    if (rightSign === 'lte') return { lte: to };
    if (rightSign === 'lt') return { lt: to };

    throw new Error('Invalid inequality signs');
  }

  /** データセット種別によって使えるラベル（unassigned/unknown）が異なるため、キーごとに配列を生成する。 */
  private labelScoreFor<K extends PredictionKey>(
    key: K
  ): ScoreOrUnassignedFor<K> {
    if (key === 'polyphen') {
      if (this.includeUnassigned && this.includeUnknown) {
        return ['unassigned', 'unknown'] as const as ScoreOrUnassignedFor<K>;
      }
      if (this.includeUnassigned) {
        return ['unassigned'] as const as ScoreOrUnassignedFor<K>;
      }
      if (this.includeUnknown) {
        return ['unknown'] as const as ScoreOrUnassignedFor<K>;
      }
      // ここには来ない想定（呼び出し側で未選択は排除）
      return ['unassigned'] as const as ScoreOrUnassignedFor<K>;
    }
    // sift / alphamissense / cadd_phred
    return ['unassigned'] as const as ScoreOrUnassignedFor<K>;
  }

  /** ラベルが1つも選ばれていないかを判定するため。polyphenはUnknownも選択肢に含まれるので条件が異なる。 */
  private isNoLabelSelected(): boolean {
    if (this.predictionKey === 'polyphen') {
      return !(this.includeUnassigned || this.includeUnknown);
    }
    return !this.includeUnassigned;
  }

  /**
   * 0-1以外のスコア範囲でも表示バーを正しく配置するため、datasetごとの範囲で正規化する。
   * 範囲外の値もクランプすることでバーがグラフ外にはみ出ないようにするため。
   */
  private valueToPercent(value: number): number {
    const prediction = PREDICTIONS[this.predictionKey];
    const width = prediction.scoreMax - prediction.scoreMin;
    if (width <= 0) return 0;
    const clamped = Math.max(
      prediction.scoreMin,
      Math.min(prediction.scoreMax, value)
    );
    return ((clamped - prediction.scoreMin) / width) * 100;
  }
}