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
import type { ConditionQuery } from './query';

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
  searchResults: (ResultData | null)[];
  numberOfRecords: number;
  offset: number;
  rowCount: number;
  /**
   * 検索リセット単位で単調増加させ、列幅自動調整の内部キャッシュ解除をStore経由で通知する。
   * DOMイベントへ依存せず、Results系コンポーネントが同じ状態変化を購読できるようにする。
   */
  resultsResetVersion: number;
  /**
   * 画面全体の検索フェーズを1箇所で表し、全体ローディング表示の判定を単純にする。
   * Results内の行loadingではなく、LoadingIndicatorの表示制御に使う。
   */
  appLoadingStatus: 'preparing' | 'searching' | 'normal';
  isLogin: boolean;
  /**
   * 検索結果のdata=1リクエスト中かを表し、Resultsの行loadingと描画待機に使う。
   * stat=1のみの統計取得やStore配列マージ中かどうかは、この値では表さない。
   */
  isSearchDataFetching: boolean;
  /**
   * searchResults配列を同期更新している間だけtrueにし、中途半端な行描画を防ぐ。
   * API通信中かどうかではなく、Store内部の配列更新ガードとして扱う。
   */
  isSearchResultsUpdating: boolean;
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
