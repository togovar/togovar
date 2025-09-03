// -------------------------------------
// Search Types
// -------------------------------------

export interface MasterConditions {
  id: MasterConditionId;
  label?: string;
  type?: MasterConditionType;
  default?: string;
  items?: MasterConditionItem[];
}

export type MasterConditionId =
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

export type MasterConditionType = 'array' | 'boolean' | 'string';

export interface MasterConditionItem {
  id?: string;
  label: string;
  type?: MasterItemType;
  default?: number | string;
  has_freq?: boolean;
  values?: string[];
  description?: string;
  items?: Array<ItemItemClass | string>;
}

export type MasterItemType = 'boolean' | 'enumeration' | 'range';

export interface ItemItemClass {
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
export type SearchMode = 'simple' | 'advanced';

export type FetchOption = SimpleSearchFetchOption | AdvancedSearchFetchOption;

export type SimpleSearchFetchOption = {
  method: 'GET';
  headers: {
    'Content-Type': 'application/json';
    Accept: string;
  };
  mode: 'cors';
  signal: AbortSignal;
};

export type AdvancedSearchFetchOption = {
  method: 'POST';
  headers: {
    'Content-Type': 'application/json';
    Accept: 'application/json';
  };
  mode: 'cors';
  signal: AbortSignal;
  body: string;
};

// -------------------------------------
// Search Messages and Status
// -------------------------------------

/** 検索メッセージの型定義 */
export type SearchMessages = {
  notice?: string;
  warning?: string;
  error?: string;
};

/** 検索ステータスの型定義 */
export type SearchStatus = {
  available: number;
  filtered: number;
};
