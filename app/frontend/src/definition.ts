/**
 * Advanced Search の条件種別を、JSONマスタ・View・query builder の間で同じ値として扱うための共通ID。
 * 値は advanced_search_conditions.json の conditions キーや API query の意味に対応する。
 */
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

/** CONDITION_TYPE のキー名から値のunion型を作るため、keyofの中間型として分けている。 */
type ConditionTypeKey = keyof typeof CONDITION_TYPE;

/** 条件種別を文字列のまま広げないため、Advanced Search 全体で使う条件IDをunion型にする。 */
export type ConditionTypeValue = (typeof CONDITION_TYPE)[ConditionTypeKey];

/** 条件候補の値と表示名を同じ形で受け渡すための最小単位。 */
export type Option = Readonly<{ value: string; label: string }>;

/** 条件ごとの表示名やrelation対応有無を、UI部品が共通に参照できる形で持つ。 */
export type ConditionMeta = Readonly<{
  label: string;
  supportsRelation?: boolean;
}>;

/** すべての条件が固定候補を持つわけではないため、条件種別ごとの候補表をPartialで表す。 */
export type ConditionOptionsMap = Readonly<
  Partial<Record<ConditionTypeValue, ReadonlyArray<Option>>>
>;

/**
 * Advanced Search Builder のノード種別を数値で持ち、条件行とグループ行を軽く比較できるようにする。
 * DOM/View間で同じ値を使うため、magic number を直接書かない。
 */
export const CONDITION_NODE_KIND = {
  condition: 0,
  group: 1,
};

/**
 * Advanced Search のdataset条件を型安全に扱うため、APIへ送るdataset名を型の元データとして持つ。
 * Simple Search は参照ゲノム別の search_conditions.json を直接読むため、この配列は通常使わない。
 * GRCh37/GRCh38 の表示可否は advanced_search_conditions.json 側が決めるため、ここは型用の広めの受け皿にする。
 */
export const FREQUENCY_DATASETS = [
  'gem_j_wga',
  'jga_wgs',
  'jga_wes',
  'jga_snp',
  'tommo',
  'ncbn',
  'jogo',
  'tommo_jsv1',
  'gnomad_genomes',
  'gnomad_exomes',
  'gnomad_sv',
] as const;

/** Advanced Search の dataset.name を任意文字列にしないため、FREQUENCY_DATASETS からunion型を作る。 */
export type FrequencyDataset = (typeof FREQUENCY_DATASETS)[number];

/**
 * genotype count 条件でAPIへ送るキーを型安全に扱うための一覧。
 * dataset frequency 条件と同じUIを使うが、count種別はこのキーに限定する。
 */
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

/** genotype count のキーを任意文字列にしないため、GENOTYPE_KEYS からunion型を作る。 */
export type GenotypeKey = (typeof GENOTYPE_KEYS)[number];

/**
 * Clinical significance の query で受け付ける分類値を型安全に扱うための一覧。
 * 表示ラベルは参照ゲノム別JSON側を正とし、ここではAPIへ送るterm値だけを持つ。
 */
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

/** significance term を任意文字列にしないため、SIGNIFICANCE_TERMS からunion型を作る。 */
export type SignificanceTerm = (typeof SIGNIFICANCE_TERMS)[number];

/**
 * query builder で外部入力を絞り込むため、配列ではなくSetとして高速にmembership判定する。
 * 型の元は SIGNIFICANCE_TERMS のままにして、定義の二重管理を避ける。
 */
export const SIGNIFICANCE_TERM_SET: ReadonlySet<SignificanceTerm> = new Set(
  SIGNIFICANCE_TERMS
);
