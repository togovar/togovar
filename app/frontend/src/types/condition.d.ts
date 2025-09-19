import type { ConditionTypeValue } from '../definition';
import type { ConditionItemView } from '../classes/Condition/ConditionItemView';
import type ConditionValues from '../classes/Condition/ConditionValues';

/** Context object passed to query builders */
type BuildContext = {
  type: ConditionTypeValue;
  values: ConditionItemValueViewEl[];
  relation?: Relation;
  valuesContainer: HTMLDivElement;
};

// Logical relation annotation stored in dataset.relation on the host node
export type Relation = 'eq' | 'ne';

export type Builder = (_ctx: BuildContext) => ConditionQuery;

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
// Query
// ───────────────────────────────────────────────────────────────────────────
// Union type representing all possible condition query structures
export type ConditionQuery =
  // | QueryValue
  | LocationQuery
  | GeneQuery
  | IdQuery
  | SignificanceQuery
  | DefaultQuery
  | { or: ConditionQuery[] }
  | { and: ConditionQuery[] };

// // Generic query value object
// export interface QueryValue {
//   [key: string]: any;
// }

// Query structure for location-based searches
export interface LocationQuery {
  location: {
    chromosome: string;
    position: number | { gte: number; lte: number };
  };
}

// Query structure for gene-based searches
export interface GeneQuery {
  gene: {
    relation?: Relation;
    terms: number[];
  };
}

// Query structure for variant ID searches
export interface IdQuery {
  id: string[];
}

// Query structure for clinical significance searches
export interface SignificanceQuery {
  [key: string]: {
    relation?: Relation;
    source: string[];
    terms: string[];
  };
}

// Default query structure for other condition types
export interface DefaultQuery {
  [key: string]: {
    relation?: Relation;
    terms: string[];
  };
}

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
