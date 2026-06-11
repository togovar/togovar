/**
 * Store & 状態管理の型定義
 *
 * アプリ全体で共有される状態の型を一元管理する。
 * コンポーネント間の状態共有は必ずここの型を通して行い、
 * StoreManager を唯一の書き込み口として保つ。
 */

// ============================================
// 検索条件・API関連の型インポート
// ============================================

import type {
  MasterConditions,
  SimpleSearchCurrentConditions,
  SearchMode,
} from './search';
import type { ResultData } from './api';
import type { ColumnConfig } from './components';

/**
 * カリオタイプビューで表示中の染色体領域を管理する型。
 * 複数染色体を同時に扱えるよう、染色体名をキーとしたindex signatureにしている。
 */
export type DisplayingRegions = {
  [chromosome: string]: {
    start: number;
    end: number;
  };
};

// ============================================
// アプリケーション状態スキーマ
// ============================================

/**
 * 検索APIから取得するレコード数の集計。
 * StoreState 内でのみ参照するため export しない。
 */
type SearchStatus = {
  available: number;
  filtered: number;
  total: number;
};

/**
 * アプリ全体の状態を1つのオブジェクトで表す。
 * unknown 型の TODO フィールドは、該当APIレスポンスの型定義が確定次第、具体型へ置き換える。
 * optional フィールドは初期化前や未使用状態を undefined で表すために省略可にしている。
 */
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
  /** 初期化・検索中・通常の3フェーズを文字列で管理し、UI側でのガード処理を単純化する */
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
  /** DisplayingRegions と同一構造。カリオタイプビューと検索条件復元の両方から参照する */
  displayingRegionsOnChromosome?: DisplayingRegions;
};
