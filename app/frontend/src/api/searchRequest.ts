import * as qs from 'qs';
import { API_URL } from '../global';
import { stripAdvancedSearchMetadata } from '../store/advancedSearchURL';
import { extractSearchCondition } from '../store/simpleSearchConditions';
import type { FetchOption, SimpleSearchCurrentConditions } from '../types';
import type { ConditionQuery } from '../types/query';

export const SEARCH_RESULT_LIMIT = 100;

/**
 * 検索モードごとのAPI仕様差をここへ閉じ込め、searchExecutor.tsを実行管理に集中させる。
 */
export function determineSearchEndpoints(
  searchMode: string,
  offset: number,
  isFirstTime: boolean,
  simpleSearchConditions: SimpleSearchCurrentConditions
): string[] {
  let basePath: string;

  switch (searchMode) {
    case 'simple': {
      // Simple searchの場合のみLIMITでの調整を行う
      const offsetStart = offset - (offset % SEARCH_RESULT_LIMIT);
      const conditions = qs.stringify(
        extractSearchCondition(simpleSearchConditions)
      );
      basePath = `${API_URL}/search?offset=${offsetStart}${
        conditions ? '&' + conditions : ''
      }`;

      return isFirstTime
        ? [`${basePath}&stat=0&data=1`, `${basePath}&stat=1&data=0`]
        : [`${basePath}&stat=0&data=1`];
    }

    case 'advanced': {
      // Advanced searchの場合は元のoffsetをそのまま使用
      basePath = `${API_URL}/api/search/variant`;

      return isFirstTime
        ? [`${basePath}?stat=0&data=1`, `${basePath}?stat=1&data=0`]
        : [`${basePath}?stat=0&data=1`];
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

  const body: Partial<{ offset: number; query: Record<string, unknown> }> = {
    offset: calculateAdvancedSearchOffset(storeOffset, SEARCH_RESULT_LIMIT),
  };

  if (advancedSearchConditions) {
    body.query = stripAdvancedSearchMetadata(advancedSearchConditions) as Record<
      string,
      unknown
    >;
  }

  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    mode: 'cors',
    signal: signal,
    body: JSON.stringify(body),
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
