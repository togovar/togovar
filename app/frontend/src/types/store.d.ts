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
  SearchMessages,
  SearchStatus,
} from './search';
import type { ResultData } from './api';
import type { ColumnConfig } from './components';
import type { KaryotypeState } from './karyotype';
import type { ConditionQuery } from './condition';

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
 * アプリ全体の状態を1つのオブジェクトで表す。
 * unknown 型の TODO フィールドは、該当APIレスポンスの型定義が確定次第、具体型へ置き換える。
 * optional フィールドは初期化前や未使用状態を undefined で表すために省略可にしている。
 */
export type StoreState = {
  karyotype?: KaryotypeState;
  /** '' は初期化前のセンチネル値。setSearchModeFromHistory が呼ばれるまでの一時的な状態 */
  searchMode: SearchMode | '';
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
  advancedSearchConditions?: ConditionQuery;
  advancedSearchURLTooLong?: boolean;
  advancedSearchRestoredFromURL?: boolean;
  searchMessages?: SearchMessages;
  searchStatus?: SearchStatus;
  statisticsDataset?: Record<string, number>;
  statisticsSignificance?: Record<string, number>;
  statisticsType?: Record<string, number>;
  statisticsConsequence?: Record<string, number>;
  showModal?: boolean;
  /** DisplayingRegions と同一構造。カリオタイプビューと検索条件復元の両方から参照する */
  displayingRegionsOnChromosome?: DisplayingRegions;
};
