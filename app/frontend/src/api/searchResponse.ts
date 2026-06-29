import { storeManager } from '../store/StoreManager';
import { API_URL } from '../global';
import type { ScrollData, SearchResults, SearchStatistics } from '../types';
import type { StoreState } from '../types/storeState';
import { getNextSearchResultCount } from '../store/searchResultsState';
import {
  getCurrentSearchMode,
  getCurrentSearchOrigin,
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

  const endpointUrl = new URL(endpoint, API_URL);
  const searchParams = endpointUrl.searchParams;
  if (searchParams.get('data') === '1') {
    applySearchDataResponse(json, endpointUrl, executionId);
  }
  if (searchParams.get('stat') === '1') {
    applySearchStatisticsResponse(json, endpointUrl, executionId);
  }
}

/**
 * data=1レスポンスをStoreへ反映し、searchExecutor.tsを通信フロー管理に集中させる。
 */
function applySearchDataResponse(
  json: unknown,
  endpointUrl: URL,
  executionId: number
): void {
  const dataResponse = parseSearchDataResponse(json);
  if (!dataResponse) {
    console.error('[search] Unexpected result shape (no data array):', json);
    return;
  }

  const rows = dataResponse.data;
  const offset = dataResponse.scroll.offset;

  rememberSingleVariantRedirectData(endpointUrl, offset, rows, executionId);
  if (redirectToSingleVariantIfReady()) {
    return;
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
function applySearchStatisticsResponse(
  json: unknown,
  endpointUrl: URL,
  executionId: number
): void {
  const searchStatistics = toSearchStatistics(json);
  if (!searchStatistics) {
    console.error('[search] Unexpected statistics shape:', json);
    return;
  }

  rememberSingleVariantRedirectStatistics(
    endpointUrl,
    searchStatistics,
    executionId
  );
  if (redirectToSingleVariantIfReady()) {
    return;
  }

  const statisticsStoreUpdate = buildStatisticsStoreUpdate(searchStatistics);
  applyStatisticsStoreUpdate(statisticsStoreUpdate);
}

/**
 * API境界ではunknownを受け、Store更新前に検索結果として最低限の形を確認する。
 */
function parseSearchDataResponse(value: unknown): SearchResults | null {
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

type SingleVariantCandidateRow = SearchResults['data'][number];

let singleVariantRedirectData: {
  key: string;
  row: SingleVariantCandidateRow | null;
} | null = null;
let singleVariantRedirectStatistics: { key: string; isSingle: boolean } | null =
  null;

/**
 * Simple/Advanced Searchの初回dataレスポンスから、1件遷移に使える行だけを候補として保持する。
 */
function rememberSingleVariantRedirectData(
  endpointUrl: URL,
  offset: number,
  rows: SearchResults['data'],
  executionId: number
): void {
  if (!isVariantSearchEndpoint(endpointUrl) || offset !== 0) {
    return;
  }

  singleVariantRedirectData = {
    key: createSearchResponsePairKey(endpointUrl, executionId),
    row: rows.length === 1 ? rows[0] : null,
  };
}

/**
 * 統計レスポンスを正として「検索結果が1件か」を保持し、dataレスポンスの行IDと突き合わせる。
 */
function rememberSingleVariantRedirectStatistics(
  endpointUrl: URL,
  searchStatistics: SearchStatistics,
  executionId: number
): void {
  if (
    !isVariantSearchEndpoint(endpointUrl) ||
    searchStatistics.scroll.offset !== 0
  ) {
    return;
  }

  const available = Math.min(
    searchStatistics.statistics.filtered,
    searchStatistics.scroll.max_rows
  );

  singleVariantRedirectStatistics = {
    key: createSearchResponsePairKey(endpointUrl, executionId),
    isSingle: available === 1,
  };
}

/**
 * data/statの両方で同じ検索が1件と確認できた時だけ、自動遷移許可を消費して詳細へ移動する。
 */
function redirectToSingleVariantIfReady(): boolean {
  if (
    !singleVariantRedirectData ||
    !singleVariantRedirectStatistics ||
    singleVariantRedirectData.key !== singleVariantRedirectStatistics.key ||
    !singleVariantRedirectData.row ||
    !singleVariantRedirectStatistics.isSingle
  ) {
    return false;
  }

  if (getCurrentSearchOrigin() !== 'user') {
    return false;
  }

  window.location.assign(
    `/variant/${encodeURIComponent(singleVariantRedirectData.row.id)}`
  );
  return true;
}

/**
 * Simple SearchとAdvanced Searchの検索APIだけを1件自動遷移の対象にする。
 */
function isVariantSearchEndpoint(endpointUrl: URL): boolean {
  return (
    endpointUrl.pathname === '/search' ||
    endpointUrl.pathname === '/api/search/variant'
  );
}

/**
 * data/stat差分のパラメータを除いて、同じ検索実行内のレスポンスか比較する。
 */
function createSearchResponsePairKey(
  endpointUrl: URL,
  executionId: number
): string {
  const params = new URLSearchParams(endpointUrl.searchParams);
  params.delete('data');
  params.delete('stat');
  params.sort();
  return `${executionId}:${endpointUrl.pathname}?${params.toString()}`;
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
  storeManager.setData('statisticsConsequence', statisticsConsequence);
}
