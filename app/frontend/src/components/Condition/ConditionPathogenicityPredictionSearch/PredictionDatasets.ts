import type { Inequality } from '../../../types';

interface ThresholdEntry {
  color: string;
  min: number;
  max: number;
  minInequalitySign: Inequality;
  maxInequalitySign: Inequality;
}
export type Threshold = Record<string, ThresholdEntry>;
type PredictionConfig = Readonly<{
  label: string;
  scoreMin: number;
  scoreMax: number;
  scoreStep: number;
  unassignedLists: readonly ['unassigned'] | readonly ['unassigned', 'unknown'];
  threshold: Threshold;
}>;

export const ALPHAMISSENSE_THRESHOLD = {
  'Likely benign': {
    color: '#9def3A',
    min: 0,
    max: 0.34,
    minInequalitySign: 'gte',
    maxInequalitySign: 'lt',
  },
  Ambiguous: {
    color: '#bbba7e',
    min: 0.34,
    max: 0.564,
    minInequalitySign: 'gte',
    maxInequalitySign: 'lte',
  },
  'Likely pathogenic': {
    color: '#ffae00',
    min: 0.564,
    max: 1,
    minInequalitySign: 'gt',
    maxInequalitySign: 'lte',
  },
} as const satisfies Threshold;

const SIFT_THRESHOLD = {
  Tolerated: {
    color: '#ff5a54',
    min: 0,
    max: 0.05,
    minInequalitySign: 'gte',
    maxInequalitySign: 'lt',
  },
  Deleterious: {
    color: '#04af58',
    min: 0.05,
    max: 1,
    minInequalitySign: 'gte',
    maxInequalitySign: 'lte',
  },
} as const satisfies Threshold;

const POLYPHEN_THRESHOLD = {
  Benign: {
    color: '#04af58',
    min: 0,
    max: 0.446,
    minInequalitySign: 'gte',
    maxInequalitySign: 'lte',
  },
  Possibly_damaging: {
    color: '#ffae00',
    min: 0.446,
    max: 0.908,
    minInequalitySign: 'gt',
    maxInequalitySign: 'lte',
  },
  Probably_damaging: {
    color: '#ff5a54',
    min: 0.908,
    max: 1,
    minInequalitySign: 'gt',
    maxInequalitySign: 'lte',
  },
} as const satisfies Threshold;

export const PREDICTIONS = {
  cadd_phred: {
    label: 'CADD PHRED',
    scoreMin: 0,
    scoreMax: 60,
    scoreStep: 1,
    unassignedLists: ['unassigned'],
    threshold: {},
  },
  alphamissense: {
    label: 'AlphaMissense',
    scoreMin: 0,
    scoreMax: 1,
    scoreStep: 0.01,
    unassignedLists: ['unassigned'],
    threshold: ALPHAMISSENSE_THRESHOLD,
  },
  sift: {
    label: 'SIFT',
    scoreMin: 0,
    scoreMax: 1,
    scoreStep: 0.01,
    unassignedLists: ['unassigned'],
    threshold: SIFT_THRESHOLD,
  },
  polyphen: {
    label: 'PolyPhen',
    scoreMin: 0,
    scoreMax: 1,
    scoreStep: 0.01,
    unassignedLists: ['unassigned', 'unknown'],
    threshold: POLYPHEN_THRESHOLD,
  },
} as const satisfies Record<string, PredictionConfig>;

export type PredictionKey = keyof typeof PREDICTIONS;
export type PredictionLabel =
  (typeof PREDICTIONS)[keyof typeof PREDICTIONS]['label'];
export type PredictionDatasets = typeof PREDICTIONS;
