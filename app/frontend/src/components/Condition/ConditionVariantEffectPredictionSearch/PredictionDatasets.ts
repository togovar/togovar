import type { Inequality } from '../../../types';

// ─────────────────────────────────────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────────────────────────────────────

/** スライダーのグラデーション色区分ひとつ分。min/max はスコアの実値で記述する。 */
interface ThresholdEntry {
  /** CSS カラー値。`var(--color-sign-*)` 形式も使用可。 */
  color: string;
  /** 区分の下限スコア（実値）。 */
  min: number;
  /** 区分の上限スコア（実値）。 */
  max: number;
  minInequalitySign: Inequality;
  maxInequalitySign: Inequality;
}

/** スライダーのグラデーション色区分マップ。キーは区分名（表示ラベルとして使われる）。 */
export type Threshold = Record<string, ThresholdEntry>;

/** 予測ツール 1 件分の設定。PREDICTIONS オブジェクトの各エントリが満たすべき形。 */
type PredictionConfig = Readonly<{
  /** タブに表示するラベル。 */
  label: string;
  /** スコアの最小値。 */
  scoreMin: number;
  /** スコアの最大値。 */
  scoreMax: number;
  /** 数値入力・スライダーの刻み幅。 */
  scoreStep: number;
  /** 目盛りの分割数。CADD は 10（0–99 を 10 刻み）、0–1 スコアは 10。 */
  numberOfScales: number;
  /** スライダー中央のスコア種別ラベル。CADD は "PHRED score"、その他は "Prediction score"。 */
  scoreLabel: string;
  /**
   * threshold-button / threshold-line を表示するか。
   * CADD はグラデーションの色区分のみに使うため false。
   */
  showThreshold: boolean;
  /** "Unassigned" / "Unknown" チェックボックスの候補リスト。 */
  unassignedLists: readonly ['unassigned'] | readonly ['unassigned', 'unknown'];
  /** スライダーグラデーションの色区分定義。 */
  threshold: Threshold;
}>;

// ─────────────────────────────────────────────────────────────────────────────
// 閾値定義
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CADD PHRED スコア (0–99) の色区分。
 * Results バッジの閾値（<10 緑・10–20 橙・≥20 赤）と合わせている。
 * パネルの sign 色変数を参照することで、テーマ変更時も追従する。
 */
export const CADD_THRESHOLD = {
  Safe: {
    color: 'var(--color-sign-safe)',
    min: 0,
    max: 10,
    minInequalitySign: 'gte',
    maxInequalitySign: 'lt',
  },
  Warning: {
    color: 'var(--color-sign-warning)',
    min: 10,
    max: 20,
    minInequalitySign: 'gte',
    maxInequalitySign: 'lte',
  },
  Dangerous: {
    color: 'var(--color-sign-dangerous)',
    min: 20,
    max: 99,
    minInequalitySign: 'gt',
    maxInequalitySign: 'lte',
  },
} as const satisfies Threshold;

/**
 * AlphaMissense スコア (0–1) の色区分。
 * 閾値は AlphaMissense 論文の定義に準拠: <0.34 良性・0.34–0.564 中間・>0.564 病原性。
 * "Likely benign" は --color-sign-normal（#9dcf3a）を使用。
 */
export const ALPHAMISSENSE_THRESHOLD = {
  'Likely benign': {
    color: 'var(--color-sign-normal)',
    min: 0,
    max: 0.34,
    minInequalitySign: 'gte',
    maxInequalitySign: 'lt',
  },
  Ambiguous: {
    color: 'var(--color-sign-unknown)',
    min: 0.34,
    max: 0.564,
    minInequalitySign: 'gte',
    maxInequalitySign: 'lte',
  },
  'Likely pathogenic': {
    color: 'var(--color-sign-warning)',
    min: 0.564,
    max: 1,
    minInequalitySign: 'gt',
    maxInequalitySign: 'lte',
  },
} as const satisfies Threshold;

/**
 * SIFT スコア (0–1) の色区分。
 * SIFT はスコアが低いほど有害なため、他ツールと色の対応が逆になる。
 * 閾値: <0.05 → Deleterious（危険色は低スコア側）。
 */
const SIFT_THRESHOLD = {
  Deleterious: {
    color: 'var(--color-sign-dangerous)',
    min: 0,
    max: 0.05,
    minInequalitySign: 'gte',
    maxInequalitySign: 'lt',
  },
  Tolerated: {
    color: 'var(--color-sign-safe)',
    min: 0.05,
    max: 1,
    minInequalitySign: 'gte',
    maxInequalitySign: 'lte',
  },
} as const satisfies Threshold;

/**
 * PolyPhen スコア (0–1) の色区分。
 * 閾値: ≤0.446 → Benign・0.446–0.908 → Possibly damaging・>0.908 → Probably damaging。
 */
const POLYPHEN_THRESHOLD = {
  Benign: {
    color: 'var(--color-sign-safe)',
    min: 0,
    max: 0.446,
    minInequalitySign: 'gte',
    maxInequalitySign: 'lte',
  },
  Possibly_damaging: {
    color: 'var(--color-sign-warning)',
    min: 0.446,
    max: 0.908,
    minInequalitySign: 'gt',
    maxInequalitySign: 'lte',
  },
  Probably_damaging: {
    color: 'var(--color-sign-dangerous)',
    min: 0.908,
    max: 1,
    minInequalitySign: 'gt',
    maxInequalitySign: 'lte',
  },
} as const satisfies Threshold;

// ─────────────────────────────────────────────────────────────────────────────
// 予測ツール設定
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Advanced Search のバリアント効果予測タブに表示する予測ツールの設定一覧。
 * タブの表示順はこのオブジェクトのキー順で決まる。
 */
export const PREDICTIONS = {
  cadd_phred: {
    label: 'CADD (PHRED score)',
    scoreMin: 0,
    scoreMax: 99,
    scoreStep: 0.1,
    numberOfScales: 10,
    scoreLabel: 'PHRED score',
    showThreshold: false,
    unassignedLists: ['unassigned'],
    threshold: CADD_THRESHOLD,
  },
  alphamissense: {
    label: 'AlphaMissense',
    scoreMin: 0,
    scoreMax: 1,
    scoreStep: 0.01,
    numberOfScales: 10,
    scoreLabel: 'Prediction score',
    showThreshold: true,
    unassignedLists: ['unassigned'],
    threshold: ALPHAMISSENSE_THRESHOLD,
  },
  sift: {
    label: 'SIFT',
    scoreMin: 0,
    scoreMax: 1,
    scoreStep: 0.01,
    numberOfScales: 10,
    scoreLabel: 'Prediction score',
    showThreshold: true,
    unassignedLists: ['unassigned'],
    threshold: SIFT_THRESHOLD,
  },
  polyphen: {
    label: 'PolyPhen',
    scoreMin: 0,
    scoreMax: 1,
    scoreStep: 0.01,
    numberOfScales: 10,
    scoreLabel: 'Prediction score',
    showThreshold: true,
    unassignedLists: ['unassigned', 'unknown'],
    threshold: POLYPHEN_THRESHOLD,
  },
} as const satisfies Record<string, PredictionConfig>;

// ─────────────────────────────────────────────────────────────────────────────
// 派生型
// ─────────────────────────────────────────────────────────────────────────────

/** PREDICTIONS のキー名を型として使う。コンポーネント間で型安全にツールを参照するために使用。 */
export type PredictionKey = keyof typeof PREDICTIONS;

/** PREDICTIONS の各エントリの label を union 型として公開する。 */
export type PredictionLabel =
  (typeof PREDICTIONS)[keyof typeof PREDICTIONS]['label'];

/** PREDICTIONS オブジェクト全体の型。TabView が datasets プロパティとして受け取る。 */
export type PredictionDatasets = typeof PREDICTIONS;
