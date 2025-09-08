interface Threshold {
  [key: string]: {
    color: string;
    min: number;
    max: number;
    minInequalitySign: string;
    maxInequalitySign: string;
  };
}

export const ALPHAMISSENSE_THRESHOLD: Threshold = {
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
};

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
};

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
};

export type PredictionKey = 'alphamissense' | 'sift' | 'polyphen';

interface Prediction {
  label: string;
  unassignedLists: string[];
  threshold: Threshold;
}

export type PredictionLabel =
  (typeof PREDICTIONS)[keyof typeof PREDICTIONS]['label'];

export const PREDICTIONS: Record<PredictionKey, Prediction> = {
  alphamissense: {
    label: 'AlphaMissense',
    unassignedLists: ['unassigned'],
    threshold: ALPHAMISSENSE_THRESHOLD,
  },
  sift: {
    label: 'SIFT',
    unassignedLists: ['unassigned'],
    threshold: SIFT_THRESHOLD,
  },
  polyphen: {
    label: 'PolyPhen',
    unassignedLists: ['unassigned', 'unknown'],
    threshold: POLYPHEN_THRESHOLD,
  },
} as const;
