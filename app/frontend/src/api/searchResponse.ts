import { storeManager } from '../store/StoreManager';
import { API_URL } from '../global';
import type { ScrollData, SearchResults, SearchStatistics } from '../types';
import { getNextSearchResultCount } from '../store/searchResultsState';
import {
  getCurrentSearchMode,
  isCurrentSearchExecution,
} from './searchExecutionState';

/**
 * endpointの種別を見てStore反映先を選び、searchExecutor.tsからレスポンスURL解析を隠す。
 */
export function applySearchResponse(
  endpoint: string,
  json: unknown,
  executionId: number
): void {
  if (!isCurrentSearchExecution(executionId)) {
    return;
  }

  // 現在の検索モードと一致する場合のみ結果を処理
  if (getCurrentSearchMode() !== storeManager.getData('searchMode')) {
    return;
  }

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
  const rows = searchResults?.data ?? [];
  const offset = searchResults?.scroll.offset ?? 0;

  if (!searchResults) {
    console.error('[search] Unexpected result shape (no data array):', json);
  }

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

  const available = Math.min(
    searchStatistics.statistics.filtered,
    searchStatistics.scroll.max_rows
  );
  storeManager.setData('searchStatus', {
    available,
    filtered: searchStatistics.statistics.filtered,
    total: searchStatistics.statistics.total,
  });
  storeManager.setData('numberOfRecords', available);

  storeManager.setData('statisticsDataset', searchStatistics.statistics.dataset);
  storeManager.setData(
    'statisticsSignificance',
    searchStatistics.statistics.significance
  );
  storeManager.setData('statisticsType', searchStatistics.statistics.type);
  storeManager.setData(
    'statisticsConsequence',
    searchStatistics.statistics.consequence
  );
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
