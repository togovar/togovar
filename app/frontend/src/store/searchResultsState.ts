import type { ResultData } from '../types';
import type { StoreState } from '../types/storeState';

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
 * 仮想スクロール用の疎な検索結果配列を作り直し、既存ページと新規ページを同じ配列へ合成する。
 */
export function mergeSearchResults(
  currentResults: ResultData[],
  records: ResultData[],
  offset: number,
  numberOfRecords: number
): ResultData[] {
  const updatedResults = Array(numberOfRecords).fill(null);

  currentResults.forEach((record, index) => {
    if (record) updatedResults[index] = record;
  });

  records.forEach((record, index) => {
    updatedResults[offset + index] = record;
  });

  return updatedResults;
}

/**
 * 表示行indexを実データindexへ変換し、未取得ページならfetch起動はせずloadingだけを返す。
 */
export function getSearchRecordByDisplayIndex(
  searchResults: ResultData[],
  displayIndex: number,
  offset: number,
  numberOfRecords: number
): SearchRecordLookupResult {
  const recordIndex = offset + displayIndex;

  if (recordIndex >= numberOfRecords) {
    return 'out of range';
  }

  return searchResults[recordIndex] || 'loading';
}

/**
 * 選択行は表示offset込みで保存されるため、パネル表示用の実レコードへ変換する。
 */
export function getSelectedSearchRecord(
  searchResults: ResultData[],
  offset: number,
  selectedRow: number | undefined
): ResultData | null {
  if (selectedRow === undefined) {
    return null;
  }

  return searchResults[offset + selectedRow] ?? null;
}
