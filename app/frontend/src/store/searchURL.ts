import * as qs from 'qs';
import type { ConditionQuery, MasterConditions, SimpleSearchCurrentConditions } from '../types';
import { encodeConditionForURL } from './advancedSearchURL';
import { extractSearchCondition } from './simpleSearchConditions';

type SearchUrlParams = Record<string, unknown>;

let currentUrlParams: SearchUrlParams = qs.parse(
  window.location.search.substring(1)
);

// ## Advanced Search URL仕様
//
// ### URLフォーマット
//   条件あり: ?mode=advanced&q=<Base64エンコードされたJSON>
//   条件なし: ?mode=advanced
//
// ### エンコード方式
//   条件オブジェクト → JSON.stringify() → btoa() (Base64) → encodeURIComponent() → `q` パラメータ
//
// ### 文字数制限
//   - Raw JSON (btoa前) が2000文字以内の場合のみ `q` パラメータをURLに付与する
//   - 2000文字を超える場合はURLを `?mode=advanced` のみにし、条件はhistory.stateへ退避する
//
// ### Simple Searchとの比較
//   Simple Search: qs.stringify() でフラットなkey=valueをURLに展開
//   Advanced Search: ネスト構造のためJSON+Base64を使用（URI encodeより~33%コンパクト）

/**
 * Simple Search条件のURL表現をここに閉じ込め、検索開始ロジックからpushStateを分離する。
 */
export function reflectSimpleSearchConditionToURI(
  currentConditions: SimpleSearchCurrentConditions,
  masterConditions: MasterConditions[]
): void {
  const diffConditions = extractSearchCondition(currentConditions, masterConditions);
  const currentTerm = currentConditions.term || '';

  if (Object.keys(diffConditions).length === 0 && currentTerm === '') {
    currentUrlParams = {
      mode: 'simple',
    };
  } else {
    currentUrlParams = {
      mode: 'simple',
      ...diffConditions,
    };

    if (currentTerm !== '') {
      currentUrlParams.term = currentTerm;
    } else {
      delete currentUrlParams.term;
    }
  }

  pushSearchUrl(currentUrlParams);
}

/**
 * Advanced Search条件のURL表現と履歴state退避をここに集約し、長すぎる条件だけ呼び出し元へ返す。
 */
export function reflectAdvancedSearchConditionToURI(
  conditions: ConditionQuery | undefined
): { isURLTooLong: boolean } {
  // conditions は setAdvancedSearchCondition で {} → undefined に正規化されるため、存在確認だけで十分。
  const hasConditions = conditions !== undefined;
  const encoded = hasConditions ? encodeConditionForURL(conditions) : null;

  let url: string;
  if (encoded !== null) {
    url = `${window.location.origin}${
      window.location.pathname
    }?mode=advanced&q=${encodeURIComponent(encoded)}`;
    currentUrlParams = { mode: 'advanced', q: encoded };
  } else {
    url = `${window.location.origin}${window.location.pathname}?mode=advanced`;
    currentUrlParams = { mode: 'advanced' };
  }

  const isURLTooLong = hasConditions && encoded === null;
  const state =
    isURLTooLong && conditions
      ? { ...currentUrlParams, advancedSearchConditions: conditions }
      : currentUrlParams;

  pushAdvancedSearchUrl(state, url);

  return { isURLTooLong };
}

/**
 * popstate時もURLを正本として扱うため、検索URLパラメータの読み取り入口を揃える。
 */
export function parseSearchURLParams(): ReturnType<typeof qs.parse> {
  currentUrlParams = qs.parse(window.location.search.substring(1));
  return currentUrlParams;
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
 * Advanced SearchはURL長制限時にstateへ条件を退避するため、履歴更新失敗時のフォールバックを持つ。
 */
function pushAdvancedSearchUrl(state: SearchUrlParams, url: string): void {
  try {
    updateSearchHistory(state, url);
  } catch {
    try {
      updateSearchHistory(currentUrlParams, url);
    } catch {
      // URL更新に失敗しても検索自体は継続できるため、ここでは何もしない。
    }
  }
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
