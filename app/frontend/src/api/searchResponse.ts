import { storeManager } from '../store/StoreManager';
import type { SearchResults, SearchStatistics } from '../types';

/**
 * data=1レスポンスをStoreへ反映し、fetchData.tsを通信フロー管理に集中させる。
 */
export function applySearchResultsResponse(json: SearchResults): void {
  const rows = Array.isArray(json?.data) ? json.data : [];
  const offset =
    typeof json?.scroll?.offset === 'number' ? json.scroll.offset : 0;

  if (!Array.isArray(json?.data)) {
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
    Math.max(currentCount, offset + rows.length)
  );
  storeManager.setResults(rows, offset);
}

/**
 * stat=1レスポンスをStoreへ反映し、件数表示と統計パネルの入力をまとめて更新する。
 */
export function applySearchStatisticsResponse(json: SearchStatistics): void {
  const available = Math.min(json.statistics.filtered, json.scroll.max_rows);
  storeManager.setData('searchStatus', {
    available,
    filtered: json.statistics.filtered,
    total: json.statistics.total,
  });
  storeManager.setData('numberOfRecords', available);

  storeManager.setData('statisticsDataset', json.statistics.dataset);
  storeManager.setData('statisticsSignificance', json.statistics.significance);
  storeManager.setData('statisticsType', json.statistics.type);
  storeManager.setData('statisticsConsequence', json.statistics.consequence);
}
