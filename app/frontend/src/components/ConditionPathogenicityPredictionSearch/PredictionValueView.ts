import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, state, query, queryAll } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { range } from 'lit/directives/range.js';
import { createGradientSlider } from './createGradientSlider';
import {
  type Threshold,
  ALPHAMISSENSE_THRESHOLD,
  PREDICTIONS,
} from './PredictionDatasets';
import { setInequalitySign } from './setInequalitySign.js';
import { capitalizeFirstLetter } from '../../utils/capitalizeFirstLetter';
import Styles from '../../../stylesheets/object/component/prediction-value-view.scss';
import type {
  PredictionKey,
  PredictionScore,
  SinglePredictionOf,
  PredictionQueryLocal,
  ScoreRange,
  Inequality,
} from '../../types';

const SLIDER_CONFIG = {
  numberOfScales: 10,
  sliderWidth: 100,
} as const;

const makeLeaf = <K extends PredictionKey>(
  k: K,
  score: PredictionScore
): SinglePredictionOf<K> => ({ [k]: { score } } as SinglePredictionOf<K>);

@customElement('prediction-value-view')
export class PredictionValueView extends LitElement {
  static styles = [Styles];

  @state() private _dataset: PredictionKey = 'alphamissense';
  @state() private _label: string = 'AlphaMissense';

  @state() private _values: [number, number] = [0, 1];
  @state() private _inequalitySigns: [Inequality, Inequality] = ['gte', 'lte'];

  @state() private _unassignedChecks: ['unassigned'] | [] = [];

  // グラデーション生成に使うしきい値データ（型は環境に合わせてOK）
  @state() private _activeDataset: Threshold = ALPHAMISSENSE_THRESHOLD;

  @query('.bar') private _bar!: HTMLDivElement;
  @queryAll('.inequality-sign')
  private _inequalitySignsEl!: NodeListOf<HTMLElement>;

  firstUpdated(): void {
    this._setBarStyles();
  }

  /** 外部から UI 値を流し込む */
  setValues(
    dataset: PredictionKey,
    values: [number, number],
    inequalitySigns: [Inequality, Inequality],
    unassignedChecks: string[]
  ): void {
    this._dataset = dataset;
    this._values = values;
    this._inequalitySigns = inequalitySigns;
    this._unassignedChecks = unassignedChecks;

    this._label = PREDICTIONS[this._dataset].label;
    this._activeDataset = PREDICTIONS[this._dataset].threshold;

    setInequalitySign(this._inequalitySignsEl[0], this._inequalitySigns[0]);
    setInequalitySign(this._inequalitySignsEl[1], this._inequalitySigns[1]);

    this._setBarStyles();
    this.requestUpdate();
  }

  private _setBarStyles(): void {
    this._bar.style.left = this._values[0] * 100 + '%';
    this._bar.style.right = 100 - this._values[1] * 100 + '%';
    this._bar.style.backgroundImage = createGradientSlider(
      this._activeDataset,
      this._bar,
      SLIDER_CONFIG.sliderWidth
    );
  }

  render(): TemplateResult {
    return html`
      <div class="pathogenicity-graph">
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
        <span class="from">${this._values[0]}</span>
        <span class="inequality-sign" data-inequality-sign="gte">&#8804;</span>
        <span class="text">Prediction score</span>
        <span class="inequality-sign" data-inequality-sign="lte">&#8804;</span>
        <span class="to">${this._values[1]}</span>
        <span class="text">
          ${this._unassignedChecks.map(capitalizeFirstLetter).join(', ')}
        </span>
      </div>
    `;
  }

  /** UI 表示用に現在値を返す（型は適宜） */
  get conditionValues(): {
    dataset: PredictionKey;
    label: string;
    values: [number, number];
    inequalitySigns: [Inequality, Inequality];
    unassignedChecks: string[];
  } {
    return {
      dataset: this._dataset,
      label: this._label,
      values: this._values,
      inequalitySigns: this._inequalitySigns,
      unassignedChecks: this._unassignedChecks,
    };
  }

  /**
   * クエリ形を返す
   * 単一 or OR のいずれか（API 仕様に合わせて ScoreRange | string[] を許容）
   */
  get queryValue(): PredictionQueryLocal {
    const key = this._dataset;

    // 未割当なし → レンジのみ
    if (this._unassignedChecks.length === 0) {
      console.log(
        '未割当なし',
        key,
        this._toScoreRange(this._values, this._inequalitySigns)
      );
      return makeLeaf(
        key,
        this._toScoreRange(this._values, this._inequalitySigns)
      );
    }

    // 点 & 非包括ペア → 未割当のみ
    if (
      this._values[0] === this._values[1] &&
      (this._inequalitySigns[0] === 'gt' || this._inequalitySigns[1] === 'lt')
    ) {
      console.log('点 & 非包括ペア', key, this._unassignedChecks);
      return makeLeaf(key, this._unassignedChecks);
    }

    // それ以外 → 未割当 OR レンジ
    const leafUnassigned = makeLeaf(key, this._unassignedChecks);
    const leafRange = makeLeaf(
      key,
      this._toScoreRange(this._values, this._inequalitySigns)
    );
    console.log('未該当', leafUnassigned, leafRange);
    return { or: [leafUnassigned, leafRange] };
  }

  /** [from,to] & 不等号 → ScoreRange へ正規化 */
  private _toScoreRange(
    [from, to]: [number, number],
    [left, right]: [Inequality, Inequality]
  ): ScoreRange {
    if (left === 'gte' && right === 'lte') return { gte: from, lte: to };
    if (left === 'gte' && right === 'lt') return { gte: from, lt: to };
    if (left === 'gt' && right === 'lte') return { gt: from, lte: to };
    if (left === 'gt' && right === 'lt') return { gt: from, lt: to };

    // 片側のみを許すなら必要に応じて追加
    if (left === 'gte') return { gte: from };
    if (left === 'gt') return { gt: from };
    if (right === 'lte') return { lte: to };
    if (right === 'lt') return { lt: to };

    throw new Error('Invalid inequality signs');
  }
}
