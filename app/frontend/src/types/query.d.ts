/**
 * Advanced Search クエリ型定義（Store/API向け）
 *
 * StoreやAPIリクエストで扱う条件クエリの構造を定義する。
 * UIビルダー型（BuildContext, EditorCtorなど）は conditionBuilder.d.ts に分離されている。
 *
 * PredictionKey だけは PredictionDatasets.ts の const から派生するため、
 * components/ への参照が1箇所残る。その他のコンポーネント依存はない。
 */

import type {
  FrequencyDataset,
  GenotypeKey,
  SignificanceTerm,
} from '../advancedCondition';
import type { PredictionKey } from '../components/Condition/ConditionPathogenicityPredictionSearch/PredictionDatasets';

// ───────────────────────────────────────────────────────────────────────────
// Query
// ───────────────────────────────────────────────────────────────────────────
type ConditionLeaf =
  | SignificanceLeaf
  | FrequencyLeaf
  | GeneLeaf
  | LocationLeaf
  | PredictionLeaf
  | PredictionQueryLocal
  | IdLeaf
  | DefaultLeaf;

type ConditionQuery = Logical<ConditionLeaf>;

type Logical<T> = T | { and: Logical<T>[] } | { or: Logical<T>[] };

type Relation = 'eq' | 'ne';

// ───────────────────────────────────────────────────────────────────────────
// Frequency Query
// ───────────────────────────────────────────────────────────────────────────
type FrequencyQuery = Logical<AlleleFrequency | AlleleCount | GenotypeCount>;
type FrequencyLeaf = AlleleFrequency | AlleleCount | GenotypeCount;

interface FrequencyBase<
  Extra extends Record<string, unknown> = Record<string, never>,
> {
  frequency: {
    dataset: { name: FrequencyDataset };
    filtered?: boolean;
  } & Extra;
}

interface AlleleFrequency extends FrequencyBase<
  { frequency: ScoreRange } & { filtered: boolean }
> {}

interface AlleleCount extends FrequencyBase<
  { count: ScoreRange } & { filtered: boolean }
> {}

interface GenotypeCount extends FrequencyBase<
  { genotype: { key: GenotypeKey; count: ScoreRange } } & {
    filtered: boolean;
  }
> {}

// ───────────────────────────────────────────────────────────────────────────
// Significance Query
// ───────────────────────────────────────────────────────────────────────────
interface SignificanceLeaf {
  significance: {
    relation: Relation;
    source: SignificanceSource[];
    terms: SignificanceTerm[];
  };
}
type SignificanceQuery = Logical<SignificanceLeaf>;

type SignificanceSource = 'mgend' | 'clinvar';

// ───────────────────────────────────────────────────────────────────────────
// Gene Query
// ───────────────────────────────────────────────────────────────────────────
interface GeneLeaf {
  gene: {
    relation: Relation;
    terms: number[];
    /** URL/画面復元用。検索APIへ送る前に取り除く。 */
    labels?: Record<string, string>;
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Location Query
// ───────────────────────────────────────────────────────────────────────────
interface LocationLeaf {
  location: {
    chromosome: string;
    position: number | ScoreRange;
  };
}

// TODO: chromosome: stringを厳密にする

// ───────────────────────────────────────────────────────────────────────────
// Prediction Query
// ───────────────────────────────────────────────────────────────────────────

type OneOrTwo<T> = readonly [T] | readonly [T, T];

type PredictionScore = ScoreRange | ['unassigned'];

type UnassignedOption = 'unassigned' | 'unknown';

type ScoreOrUnassignedFor<K extends PredictionKey> =
  | ScoreRange
  | (K extends 'polyphen'
      ? OneOrTwo<'unassigned' | 'unknown'> // polyphen only allows unassigned/unknown, 1 or 2
      : readonly ['unassigned']);

type SinglePredictionOf<K extends PredictionKey> = {
  [P in K]: { score: ScoreOrUnassignedFor<P> };
};

type PredictionLeaf = {
  [K in PredictionKey]: SinglePredictionOf<K>;
}[PredictionKey];

type PredictionQueryLocal = PredictionLeaf | { or: PredictionLeaf[] };

// ───────────────────────────────────────────────────────────────────────────
// ID Query
// ───────────────────────────────────────────────────────────────────────────
interface IdLeaf {
  id: string[];
}

// ───────────────────────────────────────────────────────────────────────────
// Default Query
// ───────────────────────────────────────────────────────────────────────────
type DefaultQueryKey = 'consequence' | 'disease' | 'sscv_db' | 'type';

type DefaultQueryOf<K extends DefaultQueryKey> = {
  [P in K]: { relation: Relation; terms: string[] };
};

type DefaultLeaf =
  | { consequence: { relation: Relation; terms: string[] } }
  | { disease: { relation: Relation; terms: string[] } }
  | { sscv_db: { relation: Relation; terms: string[] } }
  | { type: { relation: Relation; terms: string[] } };

// ───────────────────────────────────────────────────────────────────────────
// Shared Utilities
// ───────────────────────────────────────────────────────────────────────────
type ScoreRange =
  // pairs
  | { gte: number; lte: number; gt?: never; lt?: never }
  | { gt: number; lt: number; gte?: never; lte?: never }
  | { gt: number; lte: number; gte?: never; lt?: never }
  | { gte: number; lt: number; gt?: never; lte?: never }
  // singles
  | { gte: number; gt?: never; lte?: never; lt?: never }
  | { gt: number; gte?: never; lte?: never; lt?: never }
  | { lte: number; gte?: never; gt?: never; lt?: never }
  | { lt: number; gte?: never; gt?: never; lte?: never };

type Inequality = 'gt' | 'gte' | 'lt' | 'lte';
