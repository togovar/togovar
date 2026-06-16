import * as qs from 'qs';
import { executeSearch } from '../api/fetchData';
import { storeManager } from './StoreManager';
import type {
  MasterConditions,
  MasterConditionId,
  SimpleSearchCurrentConditions,
  SearchMode,
} from '../types';
import {
  encodeConditionForURL,
  decodeConditionFromURL,
} from './advancedSearchURL';

let _currentUrlParams = qs.parse(window.location.search.substring(1));

/** デフォルト値と異なる検索条件を抽出 */
export function extractSearchCondition(
  currentConditions: SimpleSearchCurrentConditions = {} as SimpleSearchCurrentConditions
): Record<string, unknown> {
  const masterSearchConditions: MasterConditions[] = storeManager.getData(
    'simpleSearchConditionsMaster'
  );

  const diffConditions: Record<string, unknown> = {};
  const conditionMap = new Map(
    masterSearchConditions.map((condition) => [condition.id, condition])
  );

  for (const [conditionKey, conditionValue] of Object.entries(
    currentConditions
  )) {
    const masterCondition = conditionMap.get(conditionKey as MasterConditionId);
    if (!masterCondition) continue;

    switch (masterCondition.type) {
      case 'array': {
        const filteredValues: Record<string, string | number> = {};
        if (typeof conditionValue === 'object' && conditionValue !== null) {
          for (const [itemKey, itemValue] of Object.entries(conditionValue)) {
            const defaultValue = masterCondition.items?.find(
              (item) => item.id === itemKey
            )?.default;
            if (itemValue !== defaultValue) {
              filteredValues[itemKey] = itemValue;
            }
          }
        }
        if (Object.keys(filteredValues).length > 0) {
          diffConditions[conditionKey] = filteredValues;
        }
        break;
      }

      case 'boolean':
      case 'string': {
        const defaultValue = masterCondition.default;
        if (conditionValue !== defaultValue) {
          diffConditions[conditionKey] = conditionValue;
        }
        break;
      }
    }
  }

  return diffConditions;
}

// Simple Search ----------------------------------------
/** SimpleSearchの検索条件を設定 */
export function setSimpleSearchCondition<
  K extends keyof SimpleSearchCurrentConditions,
>(conditionKey: K, conditionValue: SimpleSearchCurrentConditions[K]) {
  _setSimpleSearchConditions({ [conditionKey]: conditionValue });
}

/** シンプル検索条件を設定し、必要に応じて検索を開始 */
function _setSimpleSearchConditions(
  newSearchConditions: Partial<SimpleSearchCurrentConditions>
) {
  const updatedConditions = {
    ...storeManager.getData('simpleSearchConditions'),
  };
  Object.keys(newSearchConditions).forEach((conditionKey) => {
    const key = conditionKey as keyof SimpleSearchCurrentConditions;
    (updatedConditions as Record<keyof SimpleSearchCurrentConditions, unknown>)[key] = newSearchConditions[key];
  });
  storeManager.setData('simpleSearchConditions', updatedConditions);

  if (storeManager.getData('searchMode') === 'simple') {
    reflectSimpleSearchConditionToURI();
  }

  storeManager.setData('appStatus', 'searching');
  executeSearch(0, true);
}

/** 指定された検索条件キーに対応する現在の検索条件を取得する */
export function getSimpleSearchCondition(key: MasterConditionId) {
  return (storeManager.getData('simpleSearchConditions') as Record<string, unknown>)?.[key];
}

/** 指定された検索条件キーに対応するマスター検索条件を取得する */
export function getSimpleSearchConditionMaster(key: MasterConditionId) {
  return storeManager
    .getData('simpleSearchConditionsMaster')
    .find((condition: MasterConditions) => condition.id === key);
}

/** 現在のSimple Searchの条件をURLパラメータに反映する */
export function reflectSimpleSearchConditionToURI() {
  // デフォルト値と異なる検索条件を抽出
  const currentConditions = storeManager.getData('simpleSearchConditions');
  const diffConditions = extractSearchCondition(currentConditions);

  // 現在のterm値を保存（一時変数）
  const currentTerm = currentConditions.term || '';

  // 検索条件が空の場合は、URLパラメータを完全にクリア
  if (Object.keys(diffConditions).length === 0 && currentTerm === '') {
    _currentUrlParams = {
      mode: 'simple',
    };
  } else {
    // 現在のURLパラメータを保持しながら更新
    _currentUrlParams = {
      mode: 'simple',
      ...diffConditions,
    };

    // 常にtermパラメータを正しく維持
    if (currentTerm !== '') {
      _currentUrlParams.term = currentTerm;
    } else {
      delete _currentUrlParams.term;
    }
  }

  //URLを更新 (ブラウザの履歴に新しい状態を追加)
  const newUrl = `${window.location.origin}${
    window.location.pathname
  }?${qs.stringify(_currentUrlParams)}`;
  window.history.pushState(_currentUrlParams, '', newUrl);
}

export function resetSimpleSearchConditions() {
  const simpleSearchConditionsMaster = storeManager.getData(
    'simpleSearchConditionsMaster'
  );
  const resetConditions: Partial<SimpleSearchCurrentConditions> = {};
  for (const condition of simpleSearchConditionsMaster) {
    switch (condition.type) {
      case 'string':
      case 'boolean':
        if (condition.id !== 'term') {
          const key = condition.id as keyof SimpleSearchCurrentConditions;
          (resetConditions as Record<string, unknown>)[key] = condition.default;
        }
        break;
      case 'array':
        {
          const key = condition.id as keyof SimpleSearchCurrentConditions;
          (resetConditions as Record<string, unknown>)[key] = {};
        }
        break;
    }
  }
  _setSimpleSearchConditions(resetConditions);
}

/** ブラウザの「戻る」「進む」ボタンが押されたときに検索条件を更新 */
export function handleHistoryChange(e: PopStateEvent) {
  const urlParams = qs.parse(window.location.search.substring(1));
  const mode = urlParams.mode as string | undefined;
  const currentMode = storeManager.getData('searchMode');

  if (mode === 'advanced') {
    // Advanced Searchの戻る/進むでURLのqパラメータを再デコードしてストアへ反映する。
    // initializeApp()は初回ロード時にしか呼ばれないため、popstate時にこちらで再デコードする。
    // qs.parseは同名パラメータが複数あるとstring[]を返すため、先頭要素のみ使う。
    const qParam = urlParams.q;
    const first = Array.isArray(qParam) ? qParam[0] : qParam;
    const encoded = typeof first === 'string' ? first : undefined;
    // URL長制限超過で q が省略された履歴エントリに戻った場合は event.state から復元する。
    const condition = encoded
      ? decodeConditionFromURL(encoded)
      : _getConditionFromState(e.state);
    storeManager.setData('advancedSearchConditions', condition ?? {});
    // false→trueのトグルでBuilderのsubscribeを確実に発火させる。
    // モード切替でBuilderがすでにロード済みの場合も再構築が必要なため常に実行する。
    storeManager.setData('advancedSearchRestoredFromURL', false);
    storeManager.setData('advancedSearchRestoredFromURL', true);

    if (currentMode === 'advanced') {
      // 同一モード内の移動: searchModeサブスクライバは発火しないため直接検索を実行する。
      storeManager.setData('appStatus', 'searching');
      executeSearch(0, true);
    } else {
      // モード切替: setSearchModeFromHistoryでreflect*ToURIをスキップしながらモードを切替える。
      storeManager.setSearchModeFromHistory('advanced');
    }
  } else {
    // URLを正本としてSimple Search条件を丸ごと構築し直す。
    // urlParamsにはmode等の非条件キーが含まれるため、マスターに存在するキーのみを適用する。
    // URLにない条件はマスターのデフォルト値に戻すことで、履歴移動後に古い条件が残るのを防ぐ。
    const fullConditions = _buildSimpleConditionsFromURL(urlParams);
    storeManager.setData('simpleSearchConditions', fullConditions);

    if (currentMode === 'simple') {
      // 同一モード内の移動: searchModeサブスクライバは発火しないため直接検索を実行する。
      storeManager.setData('appStatus', 'searching');
      executeSearch(0, true);
    } else {
      // モード切替: setSearchModeFromHistoryでreflect*ToURIをスキップしながらモードを切替える。
      storeManager.setSearchModeFromHistory('simple');
    }
  }
}

/**
 * popstateのevent.stateからAdvanced Search条件を安全に取り出す。
 * URL長制限超過時にstateへ退避した advancedSearchConditions のみを返す。
 */
function _getConditionFromState(
  state: unknown
): Record<string, unknown> | null {
  if (state === null || typeof state !== 'object' || Array.isArray(state))
    return null;
  const val = (state as Record<string, unknown>).advancedSearchConditions;
  if (val === null || typeof val !== 'object' || Array.isArray(val))
    return null;
  return val as Record<string, unknown>;
}

/**
 * URLパラメータからSimpleSearch条件を構築する。
 * マスターのデフォルト値をベースに、URLに含まれるマスター条件キーのみを上書きする。
 * mode・qなど非条件キーは除外する。
 */
function _buildSimpleConditionsFromURL(
  urlParams: ReturnType<typeof qs.parse>
): SimpleSearchCurrentConditions {
  const master: MasterConditions[] =
    storeManager.getData('simpleSearchConditionsMaster') ?? [];
  const conditionIds = new Set(master.map((c) => c.id));

  const conditions: Record<string, unknown> = {};
  for (const cond of master) {
    switch (cond.type) {
      case 'string':
      case 'boolean':
        conditions[cond.id] = cond.default;
        break;
      case 'array':
        conditions[cond.id] = {};
        break;
    }
  }

  for (const [key, value] of Object.entries(urlParams)) {
    if (conditionIds.has(key as MasterConditionId)) {
      conditions[key] = value;
    }
  }

  return conditions as SimpleSearchCurrentConditions;
}

// Advanced Search ----------------------------------------
//
// ## Advanced Search URL仕様
//
// ### URLフォーマット
//   条件あり: ?mode=advanced&q=<Base64エンコードされたJSON>
//   条件なし: ?mode=advanced
//
// ### エンコード方式
//   条件オブジェクト → JSON.stringify() → btoa() (Base64) → encodeURIComponent() → `q` パラメータ
//   例: { and: [{ gene: { relation: "eq", terms: [123] } }] }
//       → '{"and":[{"gene":{"relation":"eq","terms":[123]}}]}'
//       → "eyJhbmQiOlt7Imdlbm..."
//
// ### デコード方式
//   `q` パラメータ → decode済み文字列 → atob() → JSON.parse() → 条件オブジェクトとして復元
//
// ### 文字数制限
//   - Raw JSON (btoa前) が 2000文字以内の場合のみ `q` パラメータをURLに付与する
//   - 2000文字を超える場合: URLは `?mode=advanced` のみとし、ユーザーに通知する
//   - 実用上限の目安: 条件15〜20個、ネスト3段階程度まで
//
// ### 制限超過時の動作
//   1. URLには `?mode=advanced` のみをセット（条件はURLに乗せない）
//   2. ユーザーへ「条件が複雑すぎるためURLで共有できません」と通知（TODO: 実装）
//   3. 検索自体は正常に実行される
//
// ### ページ読み込み時の復元
//   1. initializeApp() で `?q=` を読み取り、デコードしてストアに保存
//   2. AdvancedSearchBuilderView の初期化時にストアから条件を読み取り、Viewを再構築
//
// ### Simple Searchとの比較
//   Simple Search: qs.stringify() でフラットなkey=valueをURLに展開
//   Advanced Search: ネスト構造のためJSON+Base64を使用（URI encodeより~33%コンパクト）

/** AdvancedSearch検索条件を設定し、必要に応じて検索を実行 */
export function setAdvancedSearchCondition(newSearchConditions: unknown) {
  storeManager.setData('advancedSearchConditions', newSearchConditions);
  storeManager.setData('appStatus', 'searching');

  // URLパラメータを更新
  reflectAdvancedSearchConditionToURI();

  executeSearch(0, true);
}

export function reflectAdvancedSearchConditionToURI() {
  const conditions = storeManager.getData('advancedSearchConditions');
  // home.js が初期値として {} をセットするため、空オブジェクトは「条件なし」として扱う。
  const hasConditions =
    conditions !== null &&
    conditions !== undefined &&
    typeof conditions === 'object' &&
    Object.keys(conditions as object).length > 0;
  const encoded = hasConditions ? encodeConditionForURL(conditions) : null;

  let url: string;
  if (encoded !== null) {
    // 条件をBase64エンコードしてURLに付与
    url = `${window.location.origin}${
      window.location.pathname
    }?mode=advanced&q=${encodeURIComponent(encoded)}`;
    _currentUrlParams = { mode: 'advanced', q: encoded };
  } else {
    // 条件なし、または2000文字超過のためURLには mode のみ
    url = `${window.location.origin}${window.location.pathname}?mode=advanced`;
    _currentUrlParams = { mode: 'advanced' };
  }

  // 条件が2000文字以内に収まるようになった場合にフラグを戻す。
  // hasConditions があるのにencodedがnullの場合のみ超過扱い。
  storeManager.setData(
    'advancedSearchURLTooLong',
    hasConditions && encoded === null
  );

  // URL長制限超過時はqパラメータに条件を乗せられないため、popstate時に復元できるよう
  // historyのstateに条件を退避する。
  const state =
    hasConditions && encoded === null
      ? { ..._currentUrlParams, advancedSearchConditions: conditions }
      : _currentUrlParams;
  try {
    window.history.pushState(state, '', url);
  } catch {
    // stateが大きすぎて失敗した場合は条件退避を諦めてURLのみ更新する。
    // そのpushStateも失敗する環境ではURL更新自体を諦めて検索のみ継続する。
    try {
      window.history.pushState(_currentUrlParams, '', url);
    } catch {
      // do nothing
    }
  }
}

// ================================================================
// searchMode の副作用ハンドラ
// ================================================================

/**
 * searchMode 変化時に DOM・URL・API の副作用を実行する subscriber。
 * 状態リセットは StoreManager.searchMode() が先に実行するため、
 * この関数はリセット後の状態を前提に動作する。
 * storeManager.fromHistory が true のとき（popstate経由）は URL 更新をスキップする。
 */
function _handleSearchModeChange(mode: SearchMode | ''): void {
  if (!mode) return;

  if (typeof document !== 'undefined') {
    document.body.dataset.searchMode = mode;
  }

  switch (mode) {
    case 'simple':
      // popstate経由のときはURLがすでに確定済みのためpushStateしない
      if (!storeManager.fromHistory) reflectSimpleSearchConditionToURI();
      // パネルUIをモード切替後の条件で再描画させるために強制 publish する
      storeManager.publish('simpleSearchConditions');
      break;
    case 'advanced':
      if (!storeManager.fromHistory) reflectAdvancedSearchConditionToURI();
      break;
  }

  storeManager.setData('appStatus', 'searching');
  executeSearch(0, true);
}

/**
 * searchMode subscriber と popstate リスナーを登録する初期化関数。
 * initializeApp() の冒頭で一度だけ呼ぶこと。
 * StoreManager のコンストラクタから searchManager への循環インポートを
 * 断ち切るために、明示的な呼び出し方式にしている。
 */
export function initSearchHandlers(): void {
  storeManager.subscribe('searchMode', _handleSearchModeChange);
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('popstate', handleHistoryChange);
  }
}
