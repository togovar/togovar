import { storeManager } from '../store/StoreManager';
import { API_URL } from '../global';
import type { ScrollData, SearchResults, SearchStatistics } from '../types';
import type { StoreState } from '../types/storeState';
import { getNextSearchResultCount } from '../store/searchResultsState';
import {
  getCurrentSearchMode,
  isCurrentSearchExecution,
} from './searchExecutionState';

type StatisticsStoreUpdate = Pick<
  StoreState,
  | 'searchStatus'
  | 'numberOfRecords'
  | 'statisticsDataset'
  | 'statisticsSignificance'
  | 'statisticsType'
  | 'statisticsConsequence'
>;

/**
 * endpointの種別を見てStore反映先を選び、searchExecutor.tsからレスポンスURL解析を隠す。
 */
export function applySearchResponse(
  endpoint: string,
  json: unknown,
  executionId: number
): void {
  if (!shouldApplySearchResponse(executionId)) return;

  const searchParams = new URL(endpoint, API_URL).searchParams;
  if (searchParams.get('data') === '1') {
    applySearchResultsResponse(json);
  }
  if (searchParams.get('stat') === '1') {
    applySearchStatisticsResponse(json);
  }
}

/**
 * data=1レスポンスをStoreへ反映し、searchExecutor.tsを通信フロー管理に集中させる。
 */
function applySearchResultsResponse(json: unknown): void {
  const searchResults = toSearchResults(json);
  if (!searchResults) {
    console.error('[search] Unexpected result shape (no data array):', json);
    return;
  }

  const rows = searchResults.data;
  const offset = searchResults.scroll.offset;

  // 実際に取得したデータ件数を下限として numberOfRecords を更新する。
  // max_rows はフィルタ前の件数を返す場合があり、統計レスポンス前に使うと
  // データのない行がローディング表示されてしまうため使用しない。
  // 統計レスポンス（applySearchStatisticsResponse）が正確な総件数を上書きする。
  // 仮想スクロール中は既存の numberOfRecords を保持するため Math.max を使用する。
  const currentCount = storeManager.getData('numberOfRecords');
  storeManager.setData(
    'numberOfRecords',
    getNextSearchResultCount(currentCount, rows.length, offset)
  );
  storeManager.setResults(rows, offset);
}

/**
 * stat=1レスポンスをStoreへ反映し、件数表示と統計パネルの入力をまとめて更新する。
 */
function applySearchStatisticsResponse(json: unknown): void {
  const searchStatistics = toSearchStatistics(json);
  if (!searchStatistics) {
    console.error('[search] Unexpected statistics shape:', json);
    return;
  }

  const statisticsStoreUpdate = buildStatisticsStoreUpdate(searchStatistics);
  applyStatisticsStoreUpdate(statisticsStoreUpdate);
}

/**
 * API境界ではunknownを受け、Store更新前に検索結果として最低限の形を確認する。
 */
function toSearchResults(value: unknown): SearchResults | null {
  if (!isPlainObject(value)) return null;
  if (!Array.isArray(value.data)) return null;
  if (!isScrollData(value.scroll)) return null;
  return value as SearchResults;
}

/**
 * 統計Storeは必須フィールドを前提にするため、反映前にレスポンスの基本構造を確認する。
 */
function toSearchStatistics(value: unknown): SearchStatistics | null {
  if (!isPlainObject(value)) return null;
  if (!isPlainObject(value.statistics)) return null;
  if (!isScrollData(value.scroll)) return null;
  return value as SearchStatistics;
}

/**
 * data/stat両レスポンスで使うページング情報を同じ基準で検証する。
 */
function isScrollData(value: unknown): value is ScrollData {
  return (
    isPlainObject(value) &&
    typeof value.limit === 'number' &&
    typeof value.max_rows === 'number' &&
    typeof value.offset === 'number'
  );
}

/**
 * レスポンス検証の入口を絞り、nullや配列を誤ってオブジェクトとして扱わないようにする。
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 古い検索やモード不一致のレスポンスを入口で止め、各反映関数に世代判定を持ち込まないようにする。
 */
function shouldApplySearchResponse(executionId: number): boolean {
  if (!isCurrentSearchExecution(executionId)) {
    return false;
  }

  return getCurrentSearchMode() === storeManager.getData('searchMode');
}

/**
 * 統計レスポンスから必要なStore値だけを抜き出し、UI反映の材料を一目で追える形にする。
 */
function buildStatisticsStoreUpdate(
  searchStatistics: SearchStatistics
): StatisticsStoreUpdate {
  const available = Math.min(
    searchStatistics.statistics.filtered,
    searchStatistics.scroll.max_rows
  );

  return {
    searchStatus: {
      available,
      filtered: searchStatistics.statistics.filtered,
      total: searchStatistics.statistics.total,
    },
    numberOfRecords: available,
    statisticsDataset: searchStatistics.statistics.dataset,
    statisticsSignificance: searchStatistics.statistics.significance,
    statisticsType: searchStatistics.statistics.type,
    statisticsConsequence: searchStatistics.statistics.consequence,
  };
}

/**
 * 統計Store更新の並びを1箇所に固定し、反映項目の増減時に見落としにくくする。
 */
function applyStatisticsStoreUpdate(
  statisticsStoreUpdate: StatisticsStoreUpdate
): void {
  const {
    searchStatus,
    numberOfRecords,
    statisticsDataset,
    statisticsSignificance,
    statisticsType,
    statisticsConsequence,
  } = statisticsStoreUpdate;

  storeManager.setData('searchStatus', searchStatus);
  storeManager.setData('numberOfRecords', numberOfRecords);
  storeManager.setData('statisticsDataset', statisticsDataset);
  storeManager.setData('statisticsSignificance', statisticsSignificance);
  storeManager.setData('statisticsType', statisticsType);
  storeManager.setData(
    'statisticsConsequence',
    statisticsConsequence
  );
}
