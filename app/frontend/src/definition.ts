export const CONDITION_TYPE = {
  term: 'term',
  dataset: 'dataset',
  genotype: 'genotype',
  frequency: 'frequency',
  pathogenicity_prediction: 'pathogenicity_prediction',
  quality: 'quality',
  type: 'type',
  significance: 'significance',
  consequence: 'consequence',
  consequence_grouping: 'consequence_grouping',
  sift: 'sift',
  polyphen: 'polyphen',
  adv_frequency: 'adv_frequency',
  disease: 'disease',
  gene_symbol: 'gene',
  variant_id: 'id',
  location: 'location',
} as const;

type ConditionTypeKey = keyof typeof CONDITION_TYPE;
export type ConditionTypeValue = (typeof CONDITION_TYPE)[ConditionTypeKey];

export type Option = Readonly<{ value: string; label: string }>;
export type ConditionMeta = Readonly<{
  label: string;
  supportsRelation?: boolean;
}>;
export type ConditionOptionsMap = Readonly<
  Partial<Record<ConditionTypeValue, ReadonlyArray<Option>>>
>;

export const CONDITION_NODE_KIND = {
  condition: 0,
  group: 1,
};

export const FREQUENCY_DATASETS = [
  'gem_j_wga',
  'jga_wgs',
  'jga_wes',
  'jga_snp',
  'tommo',
  'ncbn',
  'gnomad_genomes',
  'gnomad_exomes',
] as const;
export type FrequencyDataset = (typeof FREQUENCY_DATASETS)[number];

export const GENOTYPE_KEYS = [
  'aac',
  'arc',
  'rrc',
  'aoc',
  'roc',
  'ooc',
  'hac',
  'hrc',
  'hoc',
] as const;
export type GenotypeKey = (typeof GENOTYPE_KEYS)[number];

export const SIGNIFICANCE_TERMS = [
  'NC',
  'P',
  'PLP',
  'LP',
  'LPLP',
  'DR',
  'ERA',
  'LRA',
  'URA',
  'CS',
  'A',
  'RF',
  'AF',
  'PR',
  'B',
  'LB',
  'CI',
  'AN',
  'O',
  'US',
  'NP',
] as const;
export type SignificanceTerm = (typeof SIGNIFICANCE_TERMS)[number];

export const SIGNIFICANCE_TERM_SET: ReadonlySet<SignificanceTerm> = new Set(
  SIGNIFICANCE_TERMS
);
