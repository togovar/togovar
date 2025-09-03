//  -------------------------------------
//  Result Data, Statistics Data
//  -------------------------------------

export type SearchResults = {
  data: ResultData[];
  scroll: ScrollData;
};

export type SearchStatistics = {
  statistics: StatisticsData;
  scroll: ScrollData;
};

export type ScrollData = {
  limit: number;
  max_rows: number;
  offset: number;
};

export type StatisticsData = {
  total: number;
  filtered: number;
  dataset: Record<string, number>;
  type: Record<string, number>;
  significance: Record<string, number>;
  consequence: Record<string, number>;
};

export type DatasetMaster = {
  items: DatasetMasterItem[];
};

export type DatasetMasterItem = {
  id: string;
  label: string;
  type: string;
  default: string;
  has_freq: boolean;
};

export type TypeMasterItem = {
  id: string;
  label: string;
  type: string;
  default: string;
};

export type ConsequenceMasterItem = {
  id: string;
  label: string;
  type: string;
  default: string;
  description: string;
};

export type Column = {
  id: string;
  label: string;
};

export type ResultData = {
  id: string;
  type: string;
  chromosome: string;
  position: number;
  start: number;
  stop: number;
  reference: string;
  alternate: string;
  vcf: Vcf;
  existing_variations: string[];
  symbols: GeneSymbol[];
  external_link: ExternalLink;
  significance: Significance[];
  most_severe_consequence: string;
  sift: number;
  polyphen: number;
  alphamissense: number;
  transcripts: Transcript[];
  frequencies: Frequency[];
};

export type Vcf = {
  position: number;
  reference: string;
  alternate: string;
};

export type GeneSymbol = {
  name: string;
  id: number;
  synonyms: string[];
};

export type ExternalLink = {
  dbsnp?: ExternalLinkItem[];
  clinvar?: ExternalLinkItem[];
  tommo?: ExternalLinkItem[];
  gnomad?: ExternalLinkItem[];
};

export type ExternalLinkItem = {
  title: string;
  xref: string;
};

export type Significance = {
  conditions: { name: string; medgen: string }[];
  interpretations: string[];
  submission_count: number;
  source: string;
};

export type Transcript = {
  hgnc_id: number;
  symbol: { source: string; label: string };
  sift: number;
  transcript_id: string;
  consequence: string[];
  consequence_type: string;
  hgvs_p: string;
  hgvs_c: string;
  alphamissense: number;
  gene_id: string;
  polyphen: number;
  hgvs_g: string;
};

export type Frequency = {
  ac?: number;
  af?: number;
  an?: number;
  filter?: string[];
  source?: string;
};

export type TdFrequencies = Record<string, FrequencyElement>;
export type FrequencyElement = HTMLElement & { frequency?: any };

// -------------------------------------
// Results View Data Types
// -------------------------------------

/** レコードの型定義（Results表示用） */
export type ResultsRecord = {
  chromosome: string;
  start: number;
  [key: string]: any;
};
