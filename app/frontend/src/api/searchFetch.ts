import type { FetchOption } from '../types';
import { isSearchAbortError } from './searchExecutionState';

/**
 * fetchとHTTPエラー変換をここへ閉じ込め、検索フロー側から通信詳細を隠す。
 */
export async function fetchSearchJSON(
  endpoint: string,
  options: FetchOption
): Promise<unknown> {
  try {
    const response = await fetch(endpoint, options);
    if (!response.ok) {
      throw new Error(getSearchHTTPErrorMessage(response.status));
    }
    return response.json();
  } catch (error) {
    console.error(error);
    if (isSearchAbortError(error)) {
      const abortError = new Error('ABORTED');
      abortError.name = 'AbortError';
      throw abortError;
    }
    throw error;
  }
}

/**
 * HTTPステータスを既存UIが扱っている検索エラーコードへ変換する。
 */
function getSearchHTTPErrorMessage(statusCode: number): string {
  const errorTypes: Record<number, string> = {
    400: 'INVALID_REQUEST',
    401: 'UNAUTHORIZED',
    404: 'NOT_FOUND',
    500: 'INTERNAL_SERVER_ERROR',
    502: 'BAD_GATEWAY',
  };
  return errorTypes[statusCode] || 'UNKNOWN_ERROR';
}
