import * as qs from 'qs';
import { API_URL } from '../global';
import { stripAdvancedSearchMetadata } from '../store/advancedSearchURL';
import { extractSearchCondition } from '../store/simpleSearchConditions';
import type {
  FetchOption,
  MasterConditions,
  SimpleSearchCurrentConditions,
} from '../types';
import type { ConditionQuery } from '../types/query';

export const SEARCH_RESULT_LIMIT = 100;

/**
 * 検索モードごとのAPI仕様差をここへ閉じ込め、searchExecutor.tsを実行管理に集中させる。
 */
export function determineSearchEndpoints(
  searchMode: string,
  offset: number,
  isFirstTime: boolean,
  simpleSearchConditions: SimpleSearchCurrentConditions,
  masterConditions: MasterConditions[]
): string[] {
  switch (searchMode) {
    case 'simple': {
      // Simple searchの場合のみLIMITでの調整を行う
      const simpleSearchBaseUrl = buildSimpleSearchBaseUrl(
        offset,
        simpleSearchConditions,
        masterConditions
      );
      return buildDataAndStatisticsEndpoints(simpleSearchBaseUrl, isFirstTime);
    }

    case 'advanced': {
      // Advanced searchの場合は元のoffsetをそのまま使用
      const advancedSearchBaseUrl = `${API_URL}/api/search/variant`;
      return buildDataAndStatisticsEndpoints(
        advancedSearchBaseUrl,
        isFirstTime
      );
    }

    default:
      return [];
  }
}

/**
 * data=1リクエストかどうかをURLから判定し、結果行のloading解除条件に使う。
 */
export function isDataRequestEndpoint(endpoint: string): boolean {
  return new URL(endpoint, API_URL).searchParams.get('data') === '1';
}

/**
 * fetchへ渡すmethod/body/signalを、現在の検索モードに応じて作る。
 */
export function getSearchRequestOptions(
  searchMode: string,
  storeOffset: number,
  advancedSearchConditions: ConditionQuery | undefined,
  signal: AbortSignal
): FetchOption {
  if (searchMode === 'simple') {
    return {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      mode: 'cors',
      signal: signal,
    };
  }

  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    mode: 'cors',
    signal: signal,
    body: JSON.stringify(
      buildAdvancedSearchRequestBody(storeOffset, advancedSearchConditions)
    ),
  };
}

/**
 * Advanced Search APIの既存ページング仕様に合わせ、表示offsetから取得offsetへ丸める。
 */
function calculateAdvancedSearchOffset(offset: number, limit: number): number {
  const roundedOffset =
    Math.round(offset / (limit / 2)) * (limit / 2) - limit / 4;
  return Math.max(0, roundedOffset);
}

/**
 * Simple SearchはURLクエリで条件を送るため、defaultとの差分だけをGET用URLへ載せる。
 */
function buildSimpleSearchBaseUrl(
  offset: number,
  simpleSearchConditions: SimpleSearchCurrentConditions,
  masterConditions: MasterConditions[]
): string {
  const offsetStart = offset - (offset % SEARCH_RESULT_LIMIT);
  const queryString = qs.stringify(
    extractSearchCondition(simpleSearchConditions, masterConditions)
  );

  return `${API_URL}/search?offset=${offsetStart}${
    queryString ? '&' + queryString : ''
  }`;
}

/**
 * 初回検索だけ統計も取り、追加ページ取得ではdataだけにしてAPI負荷を抑える。
 */
function buildDataAndStatisticsEndpoints(
  baseUrl: string,
  includesStatistics: boolean
): string[] {
  const dataEndpoint = appendSearchFlags(baseUrl, { stat: 0, data: 1 });
  if (!includesStatistics) return [dataEndpoint];
  return [dataEndpoint, appendSearchFlags(baseUrl, { stat: 1, data: 0 })];
}

/**
 * baseUrlに既存クエリがあるSimple Searchと、ないAdvanced Searchの両方を同じ形で扱う。
 */
function appendSearchFlags(
  baseUrl: string,
  flags: { stat: 0 | 1; data: 0 | 1 }
): string {
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}stat=${flags.stat}&data=${flags.data}`;
}

/**
 * Advanced SearchはPOST bodyで条件を送るため、URL共有用メタデータを送信前に取り除く。
 */
function buildAdvancedSearchRequestBody(
  storeOffset: number,
  advancedSearchConditions: ConditionQuery | undefined
): Partial<{ offset: number; query: Record<string, unknown> }> {
  const body: Partial<{ offset: number; query: Record<string, unknown> }> = {
    offset: calculateAdvancedSearchOffset(storeOffset, SEARCH_RESULT_LIMIT),
  };

  if (advancedSearchConditions) {
    body.query = stripAdvancedSearchMetadata(
      advancedSearchConditions
    ) as Record<string, unknown>;
  }

  return body;
}
