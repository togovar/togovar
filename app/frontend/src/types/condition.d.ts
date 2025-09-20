import type { ConditionTypeValue } from '../definition';
import type { NoRelationType } from '../conditions';
import type { ConditionItemView } from '../classes/Condition/ConditionItemView';
import type ConditionValues from '../classes/Condition/ConditionValues';

// ───────────────────────────────────────────────────────────────────────────
// Query
// ───────────────────────────────────────────────────────────────────────────
// Union type representing all possible condition query structures
type ConditionQuery =
  // | QueryValue
  | LocationQuery
  | GeneQuery
  | IdQuery
  | SignificanceQuery
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
type Relation = 'eq' | 'ne';

type BuilderMap = {
  [K in ConditionTypeValue]?: (ctx: BuildContext<K>) => ConditionQuery;
};

// // Generic query value object
// export interface QueryValue {
//   [key: string]: any;
// }

// Query structure for location
export interface LocationQuery {
  location: {
    chromosome: string;
    position: number | { gte: number; lte: number };
  };
}

// Query structure for gene
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

// Default query structure for other condition types
type DefaultQueryKey = 'consequence' | 'disease' | 'type';
interface DefaultQueryEntry {
  relation: Relation;
  terms: string[];
}
type DefaultQueryOf<K extends DefaultQueryKey> = {
  [P in K]: { relation: Relation; terms: string[] };
};

type DefaultQuery =
  | DefaultQueryOf<'consequence'>
  | DefaultQueryOf<'disease'>
  | DefaultQueryOf<'type'>;

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
  readonly queryValue: ConditionQuery;
  predictionDataset: string;
  values: Array<number>;
  inequalitySigns: Array<string>;
  unassignedChecks: Array<string>;
}

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
