// ------------------------------
// Store
// ------------------------------

/** 表示される染色体領域の型定義 */
type DisplayingRegions = {
  [chromosome: string]: {
    start: number;
    end: number;
  };
};

type StoreState = {
  karyotype: any;
  searchMode: any;
  simpleSearchConditionsMaster: MasterConditions[];
  simpleSearchConditions: SimpleSearchCurrentConditions;
  columns: Column[];
  searchResults: ResultData[];
  numberOfRecords: number;
  offset: number;
  rowCount: number;
  appStatus: 'preparing' | 'searching' | 'normal'; //'preparing' | 'searching' | 'idle'に変更する?
  isLogin: boolean;
  isFetching: boolean;
  isStoreUpdating: boolean;
  selectedRow?: number;
  advancedSearchConditions?: any;
  searchMessages?: any;
  searchStatus?: any;
  statisticsDataset?: any;
  statisticsSignificance?: any;
  statisticsType?: any;
  statisticsConsequence?: any;
  showModal?: boolean;
  displayingRegionsOnChromosome?: DisplayingRegions;
};

// -------------------------------------
// Master Conditions
// -------------------------------------
export interface MasterConditions {
  id: MasterConditionId;
  label?: string;
  type?: MasterConditionType;
  default?: string;
  items?: MasterConditionItem[];
}
type MasterConditionId =
  | 'term'
  | 'dataset'
  | 'frequency'
  | 'quality'
  | 'type'
  | 'significance'
  | 'consequence'
  | 'consequence_grouping'
  | 'alphamissense'
  | 'sift'
  | 'polyphen';

type MasterConditionType = 'array' | 'boolean' | 'string';

interface MasterConditionItem {
  id?: string;
  label: string;
  type?: MasterItemType;
  default?: number | string;
  has_freq?: boolean;
  values?: string[];
  description?: string;
  items?: Array<ItemItemClass | string>;
}

type MasterItemType = 'boolean' | 'enumeration' | 'range';

interface ItemItemClass {
  label: string;
  items: string[];
}

// -------------------------------------
// SimpleSearch Current Conditions
// -------------------------------------
export type SimpleSearchCurrentConditions = {
  mode?: SearchMode;
  term?: string;
  dataset?: Record<string, string>; // { "gem_j_wga": "1", ... }
  frequency?: {
    from: number;
    to: number;
    invert: string;
    match: string;
  };
  quality?: string;
  type?: Record<string, string>; // { "SO_0001483": "1", ... }
  significance?: Record<string, string>; // { "NC": "1", ... }
  alphamissense?: Record<string, string>; // { "N": "1", "LP": "1", ... }
  sift?: Record<string, string>; // { "N": "1", "D": "1", ... }
  polyphen?: Record<string, string>; // { "N": "1", "PROBD": "1", ... }
};

//  -------------------------------------
//  Search Mode
//  -------------------------------------
type SearchMode = 'simple' | 'advanced';

export type FetchOption = SimpleSearchFetchOption | AdvancedSearchFetchOption;

type SimpleSearchFetchOption = {
  method: 'GET';
  headers: {
    'Content-Type': 'application/json';
    Accept: string;
  };
  mode: 'cors';
  signal: AbortSignal;
};

type AdvancedSearchFetchOption = {
  method: 'POST';
  headers: {
    'Content-Type': 'application/json';
    Accept: 'application/json';
  };
  mode: 'cors';
  signal: AbortSignal;
  body: string;
};

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

type ScrollData = {
  limit: number;
  max_rows: number;
  offset: number;
};

type StatisticsData = {
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

type Vcf = {
  position: number;
  reference: string;
  alternate: string;
};

export type GeneSymbol = {
  name: string;
  id: number;
  synonyms: string[];
};

type ExternalLink = {
  dbsnp?: ExternalLinkItem[];
  clinvar?: ExternalLinkItem[];
  tommo?: ExternalLinkItem[];
  gnomad?: ExternalLinkItem[];
};

type ExternalLinkItem = {
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

type Frequency = {
  ac?: number;
  af?: number;
  an?: number;
  filter?: string[];
  source?: string;
};

export type TdFrequencies = Record<string, FrequencyElement>;
export type FrequencyElement = HTMLElement & { frequency?: any };
