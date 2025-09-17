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
