import type { ConditionTypeValue } from '../definition';
/**
 * Generic query value object
 */
export interface QueryValue {
  [key: string]: any;
}

/**
 * Query structure for location-based searches
 */
export interface LocationQuery {
  location: {
    chromosome: string;
    position: number | { gte: number; lte: number };
  };
}

/**
 * Query structure for gene-based searches
 */
export interface GeneQuery {
  gene: {
    relation: string;
    terms: number[];
  };
}

/**
 * Query structure for variant ID searches
 */
export interface IdQuery {
  id: string[];
}

/**
 * Query structure for clinical significance searches
 */
export interface SignificanceQuery {
  [key: string]: {
    relation: string;
    source: string[];
    terms: string[];
  };
}

/**
 * Default query structure for other condition types
 */
export interface DefaultQuery {
  [key: string]: {
    relation: string;
    terms: string[];
  };
}

/**
 * Custom element export interface for condition item value views
 */
export interface ConditionItemValueViewElement extends Element {
  /** The value of the condition item */
  value: string;
}

/**
 * Custom element export interface for frequency count value views
 */
export interface FrequencyCountValueViewElement extends Element {
  /** The query value for frequency counts */
  queryValue: any;
}

/**
 * Custom element export interface for prediction value views
 */
export interface PredictionValueViewElement extends Element {
  /** The query value for pathogenicity predictions */
  queryValue: any;
}

/**
 * Union type representing all possible condition query structures
 */
export type ConditionQuery =
  | QueryValue
  | LocationQuery
  | GeneQuery
  | IdQuery
  | SignificanceQuery
  | DefaultQuery
  | { or: ConditionQuery[] }
  | { and: ConditionQuery[] };

/** Context object passed to query builders */
export type BuildContext = {
  type: ConditionTypeValue;
  relation?: Relation;
  values: ConditionItemValueViewElement[];
  valuesContainer?: HTMLElement | null; //  Used by significance
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
