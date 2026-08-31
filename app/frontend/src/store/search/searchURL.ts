import * as qs from 'qs';
import type {
  ConditionQuery,
  MasterConditions,
  SimpleSearchCurrentConditions,
} from '../../types';
import { encodeConditionForBestURL } from './advancedSearchURL';
import { encodeSimpleConditionForBestURL } from './simpleSearchURL';

type SearchUrlParams = Record<string, unknown>;
export type SearchURLReflectionResult = {
  isURLTooLong: boolean;
  isStale: boolean;
};

let currentUrlParams: SearchUrlParams = qs.parse(
  window.location.search.substring(1)
);
let searchUrlReflectionId = 0;

// ## Advanced Search URL仕様
//
// ### URLフォーマット
//   条件あり: ?mode=advanced&q=<Base64エンコードされたJSON>
//   圧縮版: ?mode=advanced&qz=<deflate-raw圧縮後にBase64URLエンコードされたJSON>
//   条件なし: ?mode=advanced
//
// ### エンコード方式
//   条件オブジェクト → JSON.stringify() → UTF-8 → Base64 → `q` パラメータ
//   長い条件では CompressionStream(deflate-raw) → Base64URL → `qz` パラメータ
//
// ### 文字数制限
//   - Raw JSON が2000文字以内の場合は従来の `q` を候補にする
//   - CompressionStream対応環境ではRaw JSON 20000文字以内を `qz` の候補にする
//   - どちらも使えない場合は条件を諦め、URLを `?mode=advanced` のみにする（history.stateへの退避はしない）
//
// ### Simple Searchとの比較
//   Simple Search: 差分条件をJSON+Base64または圧縮JSON+Base64URLで格納
//   Advanced Search: ネスト構造のためJSON+Base64または圧縮JSON+Base64URLを使用
//   どちらもURLに載せられない場合の挙動は同じ（`?mode=xxx` のみにし、`searchURLTooLong` で呼び出し元へ通知する）

/**
 * Simple Search条件のURL表現をここに閉じ込め、検索開始ロジックからpushStateを分離する。
 */
export async function reflectSimpleSearchConditionToURI(
  currentConditions: SimpleSearchCurrentConditions,
  masterConditions: MasterConditions[]
): Promise<SearchURLReflectionResult> {
  const reflectionId = invalidatePendingSearchURLReflection();
  const { param: encoded, hasConditions } =
    await encodeSimpleConditionForBestURL(currentConditions, masterConditions);
  if (reflectionId !== searchUrlReflectionId) {
    return { isURLTooLong: false, isStale: true };
  }

  currentUrlParams = buildModeUrlParams('simple', encoded);
  pushSearchUrl(currentUrlParams);

  return { isURLTooLong: hasConditions && encoded === null, isStale: false };
}

/**
 * Advanced Search条件のURL表現をここに集約し、長すぎる条件だけ呼び出し元へ通知する。
 * URLに載せられない場合は条件を諦め、`?mode=advanced` のみを反映する（history.stateへの退避はしない）。
 */
export async function reflectAdvancedSearchConditionToURI(
  conditions: ConditionQuery | undefined
): Promise<SearchURLReflectionResult> {
  const reflectionId = invalidatePendingSearchURLReflection();
  // conditions は setAdvancedSearchCondition で {} → undefined に正規化されるため、存在確認だけで十分。
  const hasConditions = conditions !== undefined;
  const encoded = hasConditions
    ? await encodeConditionForBestURL(conditions)
    : null;
  if (reflectionId !== searchUrlReflectionId) {
    return { isURLTooLong: false, isStale: true };
  }

  currentUrlParams = buildModeUrlParams('advanced', encoded);
  pushSearchUrl(currentUrlParams);

  return { isURLTooLong: hasConditions && encoded === null, isStale: false };
}

/**
 * Simple/Advancedとも「載らなければmodeのみ」で揃えるため、URLパラメータの組み立てを共通化する。
 */
function buildModeUrlParams(
  mode: 'simple' | 'advanced',
  encoded: { name: 'q' | 'qz'; value: string } | null
): SearchUrlParams {
  return encoded === null ? { mode } : { mode, [encoded.name]: encoded.value };
}

/**
 * popstate時もURLを正本として扱うため、検索URLパラメータの読み取り入口を揃える。
 */
export function parseSearchURLParams(): ReturnType<typeof qs.parse> {
  currentUrlParams = qs.parse(window.location.search.substring(1));
  return currentUrlParams;
}

/**
 * Simple/AdvancedのURL反映は同じURLを書き換えるため、検索種別をまたいで古い非同期反映を無効化する。
 */
export function invalidatePendingSearchURLReflection(): number {
  searchUrlReflectionId += 1;
  return searchUrlReflectionId;
}

/**
 * 同一URLの重複履歴と未操作時のskippable履歴を避け、Simple Searchの戻る挙動を自然に保つ。
 */
function pushSearchUrl(params: SearchUrlParams): void {
  const newUrl = `${window.location.origin}${
    window.location.pathname
  }?${qs.stringify(params)}`;
  updateSearchHistory(params, newUrl);
}

/**
 * ブラウザ未操作時はreplaceStateへ切り替え、DevToolsのskippable履歴警告と不自然な履歴増殖を防ぐ。
 */
function updateSearchHistory(state: SearchUrlParams, url: string): void {
  if (isSameDocumentUrl(url)) {
    // URL長制限などでURLが変わらない場合でも、history.state は最新条件へ更新する必要がある。
    // pushState は重複URLで DevTools 警告が出るため replaceState で state だけ更新する。
    window.history.replaceState(state, '', url);
    return;
  }

  if (shouldPushHistoryEntry()) {
    window.history.pushState(state, '', url);
    return;
  }

  window.history.replaceState(state, '', url);
}

/**
 * すでに表示中のURLと同じなら履歴更新自体が不要なため、無駄なpush/replaceを避ける。
 */
function isSameDocumentUrl(url: string): boolean {
  return url === window.location.href;
}

/**
 * ユーザー操作後だけpushStateを許可し、ページ初期化や自動復元ではreplaceStateを使う。
 */
function shouldPushHistoryEntry(): boolean {
  if (typeof navigator === 'undefined' || !('userActivation' in navigator)) {
    return true;
  }

  return navigator.userActivation.hasBeenActive;
}
