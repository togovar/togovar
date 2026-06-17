import { storeManager } from '../store/StoreManager';
import type { SearchMessages } from '../types';

type SearchMessageResponse = {
  notice?: string[];
  warning?: string[];
  error?: string[];
};

/**
 * APIレスポンス内のnotice/warning/errorだけをStoreへ反映し、検索結果処理と分離する。
 */
export function applySearchMessages(jsonResponse: unknown): void {
  storeManager.setData('searchMessages', buildSearchMessages(jsonResponse));
}

/**
 * レスポンスからメッセージを組み立て、メッセージがなければ空を返す純粋な変換関数。
 */
function buildSearchMessages(jsonResponse: unknown): SearchMessages {
  if (!isSearchMessageResponse(jsonResponse)) return {};

  const messages: SearchMessages = {
    notice: joinMessage(jsonResponse.notice),
    warning: joinMessage(jsonResponse.warning),
    error: joinMessage(jsonResponse.error),
  };

  return messages.notice || messages.warning || messages.error ? messages : {};
}

/**
 * メッセージ配列を持つレスポンスだけを扱い、予期しない形を空メッセージとして無視する。
 */
function isSearchMessageResponse(value: unknown): value is SearchMessageResponse {
  if (typeof value !== 'object' || value === null) return false;
  const response = value as Record<string, unknown>;
  return (
    isOptionalStringArray(response.notice) &&
    isOptionalStringArray(response.warning) &&
    isOptionalStringArray(response.error)
  );
}

/**
 * UI側は文字列を購読するため、APIの複数メッセージを既存表示形式へ変換する。
 */
function joinMessage(messages: string[] | undefined): string | undefined {
  return messages?.join('<br>');
}

/**
 * APIが該当メッセージを返さない場合も正常系として扱うため、undefinedを許容する。
 */
function isOptionalStringArray(value: unknown): value is string[] | undefined {
  return value === undefined || (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}
