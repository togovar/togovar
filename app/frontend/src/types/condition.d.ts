import type { ConditionTypeValue } from '../definition';
import type { NoRelationType } from '../conditions';
import type { ConditionItemView } from '../classes/Condition/ConditionItemView';
import type ConditionValues from '../classes/Condition/ConditionValues';

// ───────────────────────────────────────────────────────────────────────────
// Query
// ───────────────────────────────────────────────────────────────────────────
// Union type representing all possible condition query structures
type ConditionQuery =
  | LocationQuery
  | GeneQuery
  | IdQuery
  | SignificanceQuery
  | PredictionQuery
  | DefaultQuery
  | { or: ConditionQuery[] }
  | { and: ConditionQuery[] };

/** Context object passed to query builders */
type BuildContext<T extends ConditionTypeValue = ConditionTypeValue> = {
  type: T;
  values: ConditionItemValueViewEl[];
  valuesContainer: HTMLDivElement;
} & (T extends NoRelationType
  ? { relation?: undefined }
  : { relation: Relation });

// Logical relation annotation stored in dataset.relation on the host node

type BuilderMap = {
  [K in ConditionTypeValue]?: (ctx: BuildContext<K>) => ConditionQuery;
};

type Relation = 'eq' | 'ne';

export interface LocationQuery {
  location: {
    chromosome: string;
    position: number | { gte: number; lte: number };
  };
}

interface GeneQuery {
  gene: {
    relation: Relation;
    terms: number[];
  };
}

// Query structure for variant ID
export interface IdQuery {
  id: string[];
}

// Query structure for clinical significance searches
type SignificanceSource = 'mgend' | 'clinvar';
type SignificanceTerms =
  | 'NC'
  | 'P'
  | 'PLP'
  | 'LP '
  | 'LPLP '
  | 'DR '
  | 'ERA'
  | 'LRA'
  | 'URA '
  | 'CS '
  | 'A '
  | 'RF'
  | 'AF'
  | 'PR'
  | 'B'
  | 'LB'
  | 'CI'
  | 'AN '
  | 'O '
  | 'US '
  | 'NP ';

export interface SignificanceQuery {
  significance: {
    relation: Relation;
    source: SignificanceSource[];
    terms: SignificanceTerms[];
  };
}

type PredictionKey = 'alphamissense' | 'sift' | 'polyphen';

type PredictionQueryOf<K extends PredictionKey> = {
  [P in K]?: {
    score: ScoreRange;
  };
};

type PredictionQuery<K extends PredictionKey = PredictionKey> =
  PredictionQueryOf<K>;

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

// Default query structure for other condition types
type DefaultQueryKey = 'consequence' | 'disease' | 'type';

type DefaultQueryOf<K extends DefaultQueryKey> = {
  [P in K]: { relation: Relation; terms: string[] };
};

type DefaultQuery<K extends DefaultQueryKey = DefaultQueryKey> =
  DefaultQueryOf<K>;

// ───────────────────────────────────────────────────────────────────────────
// ConditionValueEditor
// ───────────────────────────────────────────────────────────────────────────
// Custom element <condition-item-value-view>
interface ConditionItemValueViewEl extends HTMLElement {
  label?: string;
  conditionType?: string;
  value?: string;
  deleteButton?: boolean;
}

// Custom element <frequency-count-value-view>
interface FrequencyCountViewEl extends Element {
  readonly queryValue: ConditionQuery;

  setValues(
    conditionType: 'dataset' | 'genotype',
    mode: string,
    from: string | number,
    to: string | number,
    invert: string,
    filtered: boolean
  ): void;
  mode: string;
  from: string | number;
  update(): void;
}

// Custom element <prediction-value-view>
interface PredictionValueViewEl extends HTMLElement {
  readonly queryValue: PredictionQuery;
  predictionDataset: string;
  values: Array<number>;
  inequalitySigns: Array<string>;
  unassignedChecks: Array<string>;
}

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
