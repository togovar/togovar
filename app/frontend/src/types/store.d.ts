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

import type { MasterConditions, SimpleSearchCurrentConditions } from './search';
import type { Column, ResultData } from './api';

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

export type StoreState = {
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
  displayingRegionsOnChromosome?: {
    [key: string]: { start: number; end: number };
  };
};
