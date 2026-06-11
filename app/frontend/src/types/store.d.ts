/**
 * Store & State Management Type Definitions
 *
 * This module contains type definitions for:
 * - Global application state structure
 * - Store data models and schemas
 * - State update actions and mutations
 * - Data binding and reactive properties
 * - Application lifecycle states
 */

// ============================================
// State Models & Regional Data Types
// ============================================

import type {
  MasterConditions,
  SimpleSearchCurrentConditions,
  SearchMode,
} from './search';
import type { ResultData } from './api';
import type { ColumnConfig } from './components';

/** 表示される染色体領域の型定義 */
export type DisplayingRegions = {
  [chromosome: string]: {
    start: number;
    end: number;
  };
};

// ============================================
// Application State Schema
// ============================================

/** fetchData.ts で設定される検索結果のステータス */
type SearchStatus = {
  available: number;
  filtered: number;
  total: number;
};

export type StoreState = {
  // TODO: KaryotypeState を types/ へ export して具体的な型に置き換える
  karyotype: unknown;
  searchMode: SearchMode;
  simpleSearchConditionsMaster: MasterConditions[];
  simpleSearchConditions: SimpleSearchCurrentConditions;
  columns: ColumnConfig[];
  searchResults: ResultData[];
  numberOfRecords: number;
  offset: number;
  rowCount: number;
  appStatus: 'preparing' | 'searching' | 'normal';
  isLogin: boolean;
  isFetching: boolean;
  isStoreUpdating: boolean;
  selectedRow?: number;
  // TODO: AdvancedSearchConditions の型を整理して具体的な型に置き換える
  advancedSearchConditions?: unknown;
  advancedSearchURLTooLong?: boolean;
  advancedSearchRestoredFromURL?: boolean;
  // TODO: searchMessages の形（オブジェクト or 空文字）を統一して具体的な型に置き換える
  searchMessages?: unknown;
  searchStatus?: SearchStatus;
  // TODO: statistics 系は API レスポンスの型定義が揃い次第具体的な型に置き換える
  statisticsDataset?: unknown;
  statisticsSignificance?: unknown;
  statisticsType?: unknown;
  statisticsConsequence?: unknown;
  showModal?: boolean;
  displayingRegionsOnChromosome?: {
    [key: string]: { start: number; end: number };
  };
};
