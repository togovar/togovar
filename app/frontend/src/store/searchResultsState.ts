import type { ResultData } from '../types';
import type { StoreState } from '../types/storeState';

export type SearchResultSlot = ResultData | null;
export type SearchRecordLookupResult = ResultData | 'loading' | 'out of range';
export type SearchResultsResetState = Pick<
  StoreState,
  | 'numberOfRecords'
  | 'offset'
  | 'rowCount'
  | 'isSearchDataFetching'
  | 'searchResults'
  | 'resultsResetVersion'
>;

/**
 * 新規検索開始時の検索結果関連Store初期値を1箇所に寄せ、reset項目の増減漏れを防ぐ。
 */
export function createResetSearchResultsState(
  currentResultsResetVersion: number
): SearchResultsResetState {
  return {
    numberOfRecords: 0,
    offset: 0,
    rowCount: 0,
    isSearchDataFetching: false,
    searchResults: [],
    resultsResetVersion: currentResultsResetVersion + 1,
  };
}

/**
 * dataレスポンス到着時の最小総件数をここで計算し、Store更新前の件数ルールを1箇所に保つ。
 */
export function getNextSearchResultCount(
  currentNumberOfRecords: number,
  fetchedRowCount: number,
  offset: number
): number {
  return Math.max(currentNumberOfRecords, offset + fetchedRowCount);
}

/**
 * 仮想スクロール用の疎な検索結果配列を作り直し、既存ページと新規ページを同じ配列へ合成する。
 */
export function mergeSearchResults(
  currentResults: SearchResultSlot[],
  records: ResultData[],
  offset: number,
  numberOfRecords: number
): SearchResultSlot[] {
  const updatedResults: SearchResultSlot[] = Array(numberOfRecords).fill(null);

  currentResults.forEach((record, index) => {
    if (record !== null) updatedResults[index] = record;
  });

  records.forEach((record, index) => {
    updatedResults[offset + index] = record;
  });

  return updatedResults;
}

/**
 * 結果配列更新中のフラグ制御とpublish順序を定型化し、StoreManager側の手続き重複を減らす。
 */
export function applyMergedSearchResults(params: {
  currentResults: SearchResultSlot[];
  records: ResultData[];
  offset: number;
  numberOfRecords: number;
  setUpdating(isUpdating: boolean): void;
  updateResults(nextResults: SearchResultSlot[]): void;
  publishResults(): void;
}): void {
  params.setUpdating(true);
  try {
    params.updateResults(
      mergeSearchResults(
        params.currentResults,
        params.records,
        params.offset,
        params.numberOfRecords
      )
    );
    params.publishResults();
  } finally {
    params.setUpdating(false);
  }
}

/**
 * 表示行indexを実データindexへ変換し、未取得ページならfetch起動はせずloadingだけを返す。
 */
export function getSearchRecordByDisplayIndex(
  searchResults: SearchResultSlot[],
  displayIndex: number,
  offset: number,
  numberOfRecords: number
): SearchRecordLookupResult {
  const recordIndex = offset + displayIndex;

  if (recordIndex >= numberOfRecords) {
    return 'out of range';
  }

  return searchResults[recordIndex] ?? 'loading';
}

/**
 * 選択行は表示offset込みで保存されるため、パネル表示用の実レコードへ変換する。
 */
export function getSelectedSearchRecord(
  searchResults: SearchResultSlot[],
  offset: number,
  selectedRow: number | undefined
): ResultData | null {
  if (selectedRow === undefined) {
    return null;
  }

  return searchResults[offset + selectedRow] ?? null;
}
