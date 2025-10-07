import type {
  ConditionTypeValue,
  FrequencyDataset,
  GenotypeKey,
  SignificanceTerm,
} from '../definition';
import type { NoRelationType } from '../conditions';
import type { ConditionItemView } from '../classes/Condition/ConditionItemView';
import type ConditionValues from '../classes/Condition/ConditionValues';
import type { ConditionItemValueView } from '../components/ConditionItemValueView';
import type { PredictionKey } from '../components/ConditionPathogenicityPredictionSearch/PredictionDatasets';

// ───────────────────────────────────────────────────────────────────────────
// Builder
// ───────────────────────────────────────────────────────────────────────────
/** Context object passed to query builders */
type BuildContext<T extends ConditionTypeValue> = {
  type: T;
  values: ConditionItemValueView[];
  valuesContainer: HTMLDivElement;
} & (T extends NoRelationType
  ? { relation?: undefined }
  : { relation: Relation });

type BuilderMap = {
  [K in ConditionTypeValue]?: (ctx: BuildContext<K>) => ConditionQuery;
};

// ───────────────────────────────────────────────────────────────────────────
// Query
// ───────────────────────────────────────────────────────────────────────────
// Union type representing all possible condition query structures
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
  Extra extends Record<string, unknown> = Record<string, never>
> {
  frequency: {
    dataset: { name: FrequencyDataset };
    filtered?: boolean;
  } & Extra;
}

interface AlleleFrequency
  extends FrequencyBase<{ frequency: ScoreRange } & { filtered: boolean }> {}

interface AlleleCount
  extends FrequencyBase<{ count: ScoreRange } & { filtered: boolean }> {}

interface GenotypeCount
  extends FrequencyBase<
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

interface PredictionChangeDetail {
  dataset: PredictionKey;
  values: [number, number];
  inequalitySigns: [Inequality, Inequality];
  unassignedChecks?: string[];
  includeUnassigned?: boolean;
  includeUnknown?: boolean;
}

// ───────────────────────────────────────────────────────────────────────────
// ID Query
// ───────────────────────────────────────────────────────────────────────────
interface IdLeaf {
  id: string[];
}

// ───────────────────────────────────────────────────────────────────────────
// Default Query
// ───────────────────────────────────────────────────────────────────────────
type DefaultQueryKey = 'consequence' | 'disease' | 'type';

type DefaultQueryOf<K extends DefaultQueryKey> = {
  [P in K]: { relation: Relation; terms: string[] };
};

type DefaultLeaf =
  | { consequence: { relation: Relation; terms: string[] } }
  | { disease: { relation: Relation; terms: string[] } }
  | { type: { relation: Relation; terms: string[] } };

// ───────────────────────────────────────────────────────────────────────────
//
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
// ───────────────────────────────────────────────────────────────────────────
//
// ───────────────────────────────────────────────────────────────────────────
/** Command identifiers handled by the toolbar. */
type Command = 'add-condition' | 'group' | 'ungroup' | 'delete';

type CommandDef = Readonly<{
  command: Command;
  label: string;
  // TODO: Key codes (display only). Currently informational; no keybindings here.
  shortcut: number[];
}>;

/** Logical operator used to combine child conditions. */
type LogicalOperator = 'and' | 'or';

/** Minimal interface all editors must satisfy. */
interface ConditionValueEditor {
  keepLastValues(): void; // Capture current state when editing begins
  restore(): void; // Restore captured state when user cancels
  readonly isValid: boolean; // Whether this editor currently has a valid value
}

/** Constructor signature for editor classes. */
type EditorCtor = new (
  host: ConditionValues,
  view: ConditionItemView
) => ConditionValueEditor;

// ───────────────────────────────────────────────────────────────────────────
//
// ───────────────────────────────────────────────────────────────────────────
type EditorSectionClassName =
  | 'columns-editor-view' // dataset, consequence, genotype
  | 'frequency-count-editor-view' // dataset, genotype
  | 'clinical-significance-view' // significance
  | 'disease-editor-view' // disease
  | 'text-field-editor-view' // gene, variant id
  | 'location-editor-view' // location
  | 'pathogenicity-editor-view' // pathogenicity
  | 'checkboxes-editor-view'; // variant type
