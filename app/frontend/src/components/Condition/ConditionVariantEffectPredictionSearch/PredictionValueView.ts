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
  k: K,
  score: ScoreOrUnassignedFor<K>
) => ({ [k]: { score } }) as { [P in K]: { score: ScoreOrUnassignedFor<P> } };

@customElement('prediction-value-view')
export class PredictionValueView extends LitElement {
  static styles = [Styles];

  @state() private predictionKey: PredictionKey = 'cadd_phred';
  @state() private predictionLabel: PredictionLabel = 'CADD (PHRED score)';

  @state() private scoreValues: [number, number] = [0, 99];
  @state() private inequalitySigns: [Inequality, Inequality] = ['gte', 'lte'];

  @state() private includeUnassigned = false;
  @state() private includeUnknown = false; // for polyphen

  // Threshold data used for gradient generation
  @state() private activeThreshold: Threshold = CADD_THRESHOLD;

  @query('.bar') private barEl!: HTMLDivElement;
  @queryAll('.inequality-sign')
  private inequalitySignEls!: NodeListOf<HTMLElement>;

  /** Inject UI values from outside */
  setValues(
    dataset: PredictionKey,
    values: [number, number],
    inequalitySigns: [Inequality, Inequality],
    includeUnassigned: boolean,
    includeUnknown: boolean // for polyphen
  ): void {
    this.predictionKey = dataset;
    // 範囲外の値をクランプすることで表示数値とクエリの両方が scoreMin〜scoreMax に収まるようにするため
    const { scoreMin, scoreMax } = PREDICTIONS[dataset];
    this.scoreValues = [
      Math.max(scoreMin, Math.min(scoreMax, values[0])),
      Math.max(scoreMin, Math.min(scoreMax, values[1])),
    ];
    this.inequalitySigns = inequalitySigns;
    this.includeUnassigned = includeUnassigned;
    this.includeUnknown = includeUnknown; // for polyphen

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

  /** Return the current value for UI display */
  get conditionValues(): {
    dataset: PredictionKey;
    label: PredictionLabel;
    values: [number, number];
    inequalitySigns: [Inequality, Inequality];
    includeUnassigned: boolean;
    includeUnknown: boolean; // for polyphen
  } {
    return {
      dataset: this.predictionKey,
      label: this.predictionLabel,
      values: this.scoreValues,
      inequalitySigns: this.inequalitySigns,
      includeUnassigned: this.includeUnassigned,
      includeUnknown: this.includeUnknown, // for polyphen
    };
  }

  /** Return the query shape
   * Either single or OR (allowing ScoreRange | string[] to match API specs) */
  get queryValue(): PredictionQueryLocal {
    const key = this.predictionKey;

    // No Unassigned check, range only
    if (this.isNoLabelSelected()) {
      return makeLeaf(
        key,
        this.toScoreRange(this.scoreValues, this.inequalitySigns)
      );
    }

    // Point & Non-inclusive pair → Unassigned only
    const [from, to] = this.scoreValues;
    const [left, right] = this.inequalitySigns;
    const isPointNonInclusive =
      from === to && (left === 'gt' || right === 'lt');
    if (isPointNonInclusive) {
      return makeLeaf(key, this.labelScoreFor(key));
    }

    // Otherwise → Unassigned OR Range
    const leafUnassigned = makeLeaf(key, this.labelScoreFor(key));
    const leafRange = makeLeaf(
      key,
      this.toScoreRange(this.scoreValues, this.inequalitySigns)
    );
    return { or: [leafUnassigned, leafRange] };
  }

  /** [from,to] & inequality sign → Normalized to ScoreRange */
  private toScoreRange(
    [from, to]: [number, number],
    [left, right]: [Inequality, Inequality]
  ): ScoreRange {
    if (left === 'gte' && right === 'lte') return { gte: from, lte: to };
    if (left === 'gte' && right === 'lt') return { gte: from, lt: to };
    if (left === 'gt' && right === 'lte') return { gt: from, lte: to };
    if (left === 'gt' && right === 'lt') return { gt: from, lt: to };

    // If only one side is permitted, add as needed.
    if (left === 'gte') return { gte: from };
    if (left === 'gt') return { gt: from };
    if (right === 'lte') return { lte: to };
    if (right === 'lt') return { lt: to };

    throw new Error('Invalid inequality signs');
  }

  // Generates and returns a key-dependent array of unassigned labels.
  private labelScoreFor<K extends PredictionKey>(
    k: K
  ): ScoreOrUnassignedFor<K> {
    if (k === 'polyphen') {
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

  // Determine whether nothing has been selected
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
