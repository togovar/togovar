import { storeManager } from '../store/StoreManager';
import type { SearchMessages } from '../types';

type SearchMessageResponse = {
  notice?: string[];
  warning?: string[];
  error?: string[];
};

const SEARCH_URL_TOO_LONG_WARNING =
  'The search conditions could not be fully included in the shared URL (they may be too long, or your browser may not support compressed URL parameters). The shared URL may only partially reflect the search conditions.';

/**
 * APIレスポンス内のnotice/warning/errorだけをStoreへ反映し、検索結果処理と分離する。
 */
export function applySearchMessages(jsonResponse: unknown): void {
  storeManager.setData(
    'searchMessages',
    mergeSearchURLTooLongWarning(
      mergeURLRestoreWarning(normalizeSearchMessages(jsonResponse))
    )
  );
}

/**
 * Storeには表示可能な文字列だけを入れたいので、APIの配列形式をここで正規化する。
 */
function normalizeSearchMessages(jsonResponse: unknown): SearchMessages {
  if (!isSearchMessageResponse(jsonResponse)) return {};

  const messages: SearchMessages = {
    notice: joinApiMessagesForHtml(jsonResponse.notice),
    warning: joinApiMessagesForHtml(jsonResponse.warning),
    error: joinApiMessagesForHtml(jsonResponse.error),
  };

  return messages.notice || messages.warning || messages.error ? messages : {};
}

/**
 * 共有URLの復元失敗はAPIレスポンス由来ではないため、APIメッセージへ合成して表示を維持する。
 */
function mergeURLRestoreWarning(messages: SearchMessages): SearchMessages {
  const warning = storeManager.getData('searchURLRestoreWarning');
  if (!warning) return messages;

  return appendWarning(messages, warning);
}

/**
 * Simple/Advancedとも条件が長すぎてURLへ載せられなかった場合、共有URLが不完全であることをその場で伝える。
 */
function mergeSearchURLTooLongWarning(messages: SearchMessages): SearchMessages {
  if (!storeManager.getData('searchURLTooLong')) return messages;

  return appendWarning(messages, SEARCH_URL_TOO_LONG_WARNING);
}

/**
 * URL関連の警告はAPIメッセージより先に読ませたいため、常に先頭へ追加する。
 */
function appendWarning(messages: SearchMessages, warning: string): SearchMessages {
  return {
    ...messages,
    warning: messages.warning ? `${warning}<br>${messages.warning}` : warning,
  };
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
function joinApiMessagesForHtml(messages: string[] | undefined): string | undefined {
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
