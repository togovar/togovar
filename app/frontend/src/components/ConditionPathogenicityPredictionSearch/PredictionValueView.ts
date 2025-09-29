import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, state, query, queryAll } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { range } from 'lit/directives/range.js';
import { createGradientSlider } from './createGradientSlider';
import {
  type Threshold,
  type PredictionKey,
  type PredictionLabel,
  ALPHAMISSENSE_THRESHOLD,
  PREDICTIONS,
} from './PredictionDatasets';
import { setInequalitySign } from './setInequalitySign';
import Styles from '../../../stylesheets/object/component/prediction-value-view.scss';
import type {
  ScoreOrUnassignedFor,
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
  score: ScoreOrUnassignedFor<K>
) => ({ [k]: { score } } as { [P in K]: { score: ScoreOrUnassignedFor<P> } });

@customElement('prediction-value-view')
export class PredictionValueView extends LitElement {
  static styles = [Styles];

  @state() private _dataset: PredictionKey = 'alphamissense';
  @state() private _label: PredictionLabel = 'AlphaMissense';

  @state() private _values: [number, number] = [0, 1];
  @state() private _inequalitySigns: [Inequality, Inequality] = ['gte', 'lte'];

  @state() private _includeUnassigned = false;
  @state() private _includeUnknown = false; // for polyphen

  // Threshold data used for gradient generation
  @state() private _activeDataset: Threshold = ALPHAMISSENSE_THRESHOLD;

  @query('.bar') private _bar!: HTMLDivElement;
  @queryAll('.inequality-sign')
  private _inequalitySignsEl!: NodeListOf<HTMLElement>;

  firstUpdated(): void {
    this._setBarStyles();
  }

  /** Inject UI values from outside */
  setValues(
    dataset: PredictionKey,
    values: [number, number],
    inequalitySigns: [Inequality, Inequality],
    includeUnassigned: boolean,
    includeUnknown: boolean // for polyphen
  ): void {
    this._dataset = dataset;
    this._values = values;
    this._inequalitySigns = inequalitySigns;
    this._includeUnassigned = includeUnassigned;
    this._includeUnknown = includeUnknown; // for polyphen

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
          ${[
            this._includeUnassigned && 'Unassigned',
            this._dataset === 'polyphen' && this._includeUnknown && 'Unknown',
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
      dataset: this._dataset,
      label: this._label,
      values: this._values,
      inequalitySigns: this._inequalitySigns,
      includeUnassigned: this._includeUnassigned,
      includeUnknown: this._includeUnknown, // for polyphen
    };
  }

  /** Return the query shape
   * Either single or OR (allowing ScoreRange | string[] to match API specs) */
  get queryValue(): PredictionQueryLocal {
    const key = this._dataset;

    // No Unassigned check, range only
    if (this._noLabelSelected()) {
      return makeLeaf(
        key,
        this._toScoreRange(this._values, this._inequalitySigns)
      );
    }

    // Point & Non-inclusive pair → Unassigned only
    const [from, to] = this._values;
    const [left, right] = this._inequalitySigns;
    const isPointNonInclusive =
      from === to && (left === 'gt' || right === 'lt');
    if (isPointNonInclusive) {
      return makeLeaf(key, this._labelScoreFor(key));
    }

    // Otherwise → Unassigned OR Range
    const leafUnassigned = makeLeaf(key, this._labelScoreFor(key));
    const leafRange = makeLeaf(
      key,
      this._toScoreRange(this._values, this._inequalitySigns)
    );
    return { or: [leafUnassigned, leafRange] };
  }

  /** [from,to] & inequality sign → Normalized to ScoreRange */
  private _toScoreRange(
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
  private _labelScoreFor<K extends PredictionKey>(
    k: K
  ): ScoreOrUnassignedFor<K> {
    if (k === 'polyphen') {
      if (this._includeUnassigned && this._includeUnknown) {
        return ['unassigned', 'unknown'] as const as ScoreOrUnassignedFor<K>;
      }
      if (this._includeUnassigned) {
        return ['unassigned'] as const as ScoreOrUnassignedFor<K>;
      }
      if (this._includeUnknown) {
        return ['unknown'] as const as ScoreOrUnassignedFor<K>;
      }
      // ここには来ない想定（呼び出し側で未選択は排除）
      return ['unassigned'] as const as ScoreOrUnassignedFor<K>;
    }
    // sift / alphamissense
    return ['unassigned'] as const as ScoreOrUnassignedFor<K>;
  }

  // Determine whether nothing has been selected
  private _noLabelSelected(): boolean {
    if (this._dataset === 'polyphen') {
      return !(this._includeUnassigned || this._includeUnknown);
    }
    return !this._includeUnassigned;
  }
}
