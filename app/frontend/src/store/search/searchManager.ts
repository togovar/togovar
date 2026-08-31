import { executeSearch } from '../../api/searchExecutor';
import { clearSingleVariantRedirectCandidates } from '../../api/searchResponse';
import {
  markSearchOriginBeforeDebounce,
  type SearchOrigin,
} from '../../api/searchExecutionState';
import { storeManager } from '../StoreManager';
import type {
  MasterConditions,
  MasterConditionId,
  SimpleSearchCurrentConditions,
  SearchMode,
} from '../../types';
import type { ConditionQuery } from '../../types/query';
import { ADVANCED_SEARCH_URL_RESTORE_WARNING } from './advancedSearchURL';
import {
  buildSimpleConditionsFromURL,
  getAdvancedConditionFromHistory,
} from './searchHistory';
import {
  parseSearchURLParams,
  reflectAdvancedSearchConditionToURI,
  reflectSimpleSearchConditionToURI,
} from './searchURL';

let historyRestoreId = 0;

// ================================================================
// Simple Search 条件更新
// ================================================================

/**
 * Simple Search中のユーザー操作だけを検索条件更新として扱うため、公開入口を1つに絞る。
 */
export function setSimpleSearchCondition<
  K extends keyof SimpleSearchCurrentConditions,
>(conditionKey: K, conditionValue: SimpleSearchCurrentConditions[K]): void {
  applySimpleSearchConditionPatch({ [conditionKey]: conditionValue });
}

/**
 * Simple Search以外の画面から誤って検索が走らないよう、モード確認後に条件・URL・検索をまとめて更新する。
 */
function applySimpleSearchConditionPatch(
  newSearchConditions: Partial<SimpleSearchCurrentConditions>
): void {
  if (storeManager.getData('searchMode') !== 'simple') return;
  invalidatePendingHistoryRestore();
  clearAdvancedSearchURLRestoreWarning();

  const updatedConditions = {
    ...storeManager.getData('simpleSearchConditions'),
    ...newSearchConditions,
  } as SimpleSearchCurrentConditions;
  storeManager.setData('simpleSearchConditions', updatedConditions);

  void reflectSimpleSearchConditionToURI(
    updatedConditions,
    storeManager.getData('simpleSearchConditionsMaster')
  );

  requestInitialSearch('user');
}

/**
 * UI部品がStore全体を意識せず現在値だけ読めるよう、条件キー単位の取得に閉じ込める。
 */
export function getSimpleSearchCondition(key: MasterConditionId): unknown {
  return (
    storeManager.getData('simpleSearchConditions') as Record<string, unknown>
  )?.[key];
}

/**
 * 表示やフィルター変換がマスター配列の探索方法へ依存しないよう、条件定義の取得をここに集約する。
 */
export function getSimpleSearchConditionMaster(
  key: MasterConditionId
): MasterConditions | undefined {
  return storeManager
    .getData('simpleSearchConditionsMaster')
    .find((condition: MasterConditions) => condition.id === key);
}

/**
 * 検索語は残してフィルターだけ初期化するため、マスター定義から条件型ごとのリセット値を作る。
 */
export function resetSimpleSearchConditions(): void {
  applySimpleSearchConditionPatch(createSimpleSearchResetConditions());
}

/**
 * リセット時の値生成を分離し、boolean/string/array条件の初期化規則を読みやすく保つ。
 */
function createSimpleSearchResetConditions(): Partial<SimpleSearchCurrentConditions> {
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
  return resetConditions;
}

// ================================================================
// ブラウザ履歴からの復元
// ================================================================

/**
 * ブラウザの戻る/進むではURLを正本として復元し、自動遷移は必ず無効化する。
 */
export async function handleHistoryChange(e: PopStateEvent): Promise<void> {
  prepareHistoryNavigationSearch();
  const restoreId = invalidatePendingHistoryRestore();

  const urlParams = parseSearchURLParams();
  const mode = normalizeModeParam(urlParams.mode);
  const currentMode = storeManager.getData('searchMode');

  if (mode === 'advanced') {
    await restoreAdvancedSearchFromHistory(
      urlParams,
      e.state,
      currentMode,
      restoreId
    );
    return;
  }

  await restoreSimpleSearchFromHistory(urlParams, currentMode, restoreId);
}

/**
 * qs.parse()は?mode=a&mode=bのような重複パラメータを配列で返すため、比較前に先頭要素へ正規化する。
 */
function normalizeModeParam(rawMode: unknown): string | undefined {
  const candidate = Array.isArray(rawMode) ? rawMode[0] : rawMode;
  return typeof candidate === 'string' ? candidate : undefined;
}

/**
 * Advanced Searchの履歴復元ではURL長制限時のhistory.state退避も読む必要があるため、専用手順に分ける。
 */
function restoreAdvancedSearchFromHistory(
  urlParams: Record<string, unknown>,
  historyState: unknown,
  currentMode: SearchMode | '',
  restoreId: number
): Promise<void> {
  return getAdvancedConditionFromHistory(
    urlParams,
    historyState
  ).then((restoreResult) => {
    if (!isCurrentHistoryRestore(restoreId)) return;
    setAdvancedSearchURLRestoreWarning(restoreResult.shouldWarn);
    storeManager.setData(
      'advancedSearchConditions',
      restoreResult.condition ?? undefined
    );
    notifyAdvancedSearchBuilderRestored();
    continueHistorySearchInMode('advanced', currentMode);
  });
}

/**
 * Simple Searchの履歴復元ではURLにない条件をデフォルトへ戻し、前の絞り込み残りを防ぐ。
 */
async function restoreSimpleSearchFromHistory(
  urlParams: Record<string, unknown>,
  currentMode: SearchMode | '',
  restoreId: number
): Promise<void> {
  const restoredConditions = await buildSimpleConditionsFromURL(
    urlParams,
    storeManager.getData('simpleSearchConditionsMaster') ?? []
  );
  if (!isCurrentHistoryRestore(restoreId)) return;
  clearAdvancedSearchURLRestoreWarning();
  storeManager.setData('simpleSearchConditions', restoredConditions);
  continueHistorySearchInMode('simple', currentMode);
}

/**
 * 同一モードではsubscriberが発火しないため直接検索し、モード切替ではStoreManagerの履歴専用APIに任せる。
 */
function continueHistorySearchInMode(
  restoredMode: SearchMode,
  currentMode: SearchMode | ''
): void {
  if (currentMode === restoredMode) {
    requestInitialSearch('history');
    return;
  }

  storeManager.setSearchModeFromHistory(restoredMode);
}

// ================================================================
// Advanced Search 条件更新
// ================================================================

/**
 * Advanced Searchの空条件はundefinedへ正規化し、Store/API/URLの「条件なし」表現を揃える。
 */
export function setAdvancedSearchCondition(
  newSearchConditions: ConditionQuery
): void {
  invalidatePendingHistoryRestore();
  clearAdvancedSearchURLRestoreWarning();
  const normalizedConditions =
    Object.keys(newSearchConditions).length === 0
      ? undefined
      : newSearchConditions;
  storeManager.setData('advancedSearchConditions', normalizedConditions);

  reflectCurrentAdvancedConditionToUrl();

  requestInitialSearch('user');
}

/**
 * qz復元失敗の警告は、その後の通常操作や別履歴復元へ持ち越さない。
 */
function clearAdvancedSearchURLRestoreWarning(): void {
  setAdvancedSearchURLRestoreWarning(false);
}

/**
 * 復元警告の文言を一箇所で扱い、boolean判定と表示文言の散在を避ける。
 */
function setAdvancedSearchURLRestoreWarning(shouldWarn: boolean): void {
  storeManager.setData(
    'advancedSearchURLRestoreWarning',
    shouldWarn ? ADVANCED_SEARCH_URL_RESTORE_WARNING : undefined
  );
}

/**
 * popstate復元は非同期なので、古い戻る/進むの復元結果が最新URLの状態を上書きしないようにする。
 */
function isCurrentHistoryRestore(restoreId: number): boolean {
  return restoreId === historyRestoreId;
}

/**
 * 新しい履歴復元やユーザー操作が始まった時点で、未完了の古い履歴復元を無効化する。
 */
function invalidatePendingHistoryRestore(): number {
  historyRestoreId += 1;
  return historyRestoreId;
}

/**
 * URL生成はsearchURL.tsへ委譲し、Advanced Search画面が必要とするURL長制限フラグだけStoreへ戻す。
 */
function reflectCurrentAdvancedConditionToUrl(): void {
  const conditions = storeManager.getData('advancedSearchConditions');
  void reflectAdvancedSearchConditionToURI(conditions).then(
    ({ isURLTooLong, isStale }) => {
      if (isStale) return;
      storeManager.setData('advancedSearchURLTooLong', isURLTooLong);
    }
  );
}

/**
 * URL復元後は同じtrue値でもBuilder再構築が必要なため、false→trueのトグルで通知する。
 */
function notifyAdvancedSearchBuilderRestored(): void {
  storeManager.setData('advancedSearchRestoredFromURL', false);
  storeManager.setData('advancedSearchRestoredFromURL', true);
}

// ================================================================
// searchMode の副作用ハンドラ
// ================================================================

/**
 * searchMode変更時の副作用をここに集め、StoreManager本体がURL/API層を直接知らずに済むようにする。
 */
function handleSearchModeChange(mode: SearchMode | ''): void {
  if (!mode) return;

  reflectSearchModeToBodyDataset(mode);
  if (!storeManager.fromHistory) {
    clearAdvancedSearchURLRestoreWarning();
  }

  switch (mode) {
    case 'simple':
      handleSimpleModeSelected();
      break;
    case 'advanced':
      handleAdvancedModeSelected();
      break;
  }

  requestInitialSearch(storeManager.fromHistory ? 'history' : 'system');
}

/**
 * CSSや表示切替がStoreを読まずに済むよう、現在モードをbodyのdata属性へ反映する。
 */
function reflectSearchModeToBodyDataset(mode: SearchMode): void {
  if (typeof document === 'undefined') return;
  document.body.dataset.searchMode = mode;
}

/**
 * Simple Searchへ切り替える時はURL反映と条件UIの再描画通知を同じ順序で行う。
 */
function handleSimpleModeSelected(): void {
  if (!storeManager.fromHistory) {
    void reflectSimpleSearchConditionToURI(
      storeManager.getData('simpleSearchConditions'),
      storeManager.getData('simpleSearchConditionsMaster')
    );
  }

  storeManager.publish('simpleSearchConditions');
}

/**
 * Advanced Searchへ切り替える時は履歴復元中のpushStateを避け、それ以外はURL共有状態を更新する。
 */
function handleAdvancedModeSelected(): void {
  if (storeManager.fromHistory) return;
  reflectCurrentAdvancedConditionToUrl();
}

/**
 * 仮想スクロールが未取得ページに到達したときにコンポーネントから呼ぶ。
 * Store は API を直接呼ばない設計のため、fetch のトリガーはここに集約する。
 */
export function requestNextPage(recordIndex: number): void {
  executeSearch(recordIndex, false, 'pagination');
}

/**
 * 条件変更や履歴復元では先頭ページから取り直すため、loading表示と初回検索を同じ入口で開始する。
 */
function requestInitialSearch(searchOrigin: SearchOrigin): void {
  prepareSearchOriginBeforeDebouncedRequest(searchOrigin);
  storeManager.setData('appLoadingStatus', 'searching');
  executeSearch(0, true, searchOrigin);

  // 履歴復元はdebounce待機中に前回検索のexecutionId/abortが更新されないため、
  // 即時flushして古いレスポンスがStoreへ紛れ込む隙をなくす。
  if (searchOrigin === 'history') {
    executeSearch.flush();
  }
}

/**
 * debounce中の古いレスポンスも正しい起点で判定できるよう、検索開始前に発火元を先に共有する。
 */
function prepareSearchOriginBeforeDebouncedRequest(
  searchOrigin: SearchOrigin
): void {
  markSearchOriginBeforeDebounce(searchOrigin);
  if (searchOrigin === 'history') {
    prepareHistoryNavigationSearch();
  }
}

/**
 * ブラウザ操作では前回の1件検索候補を再利用しないよう、履歴由来の状態へ切り替えて保留検索も止める。
 */
function prepareHistoryNavigationSearch(): void {
  markSearchOriginBeforeDebounce('history');
  executeSearch.cancel();
  clearSingleVariantRedirectCandidates();
}

/**
 * bfcacheから戻った検索画面ではpopstateを通らない場合があるため、pageshowで履歴由来に切り替える。
 * popstateがpageshowより先に発火したブラウザではexecuteSearch.cancel()により検索が止まるため、
 * pageshowでも必ず再起動することで発火順に依存しない動作を保証する。
 */
function handlePageShow(event: PageTransitionEvent): void {
  if (!event.persisted) return;
  requestInitialSearch('history');
}

/**
 * StoreManagerからの循環importを避けるため、initializeApp()から明示的に副作用ハンドラを登録する。
 */
export function initSearchHandlers(): void {
  storeManager.subscribe('searchMode', handleSearchModeChange);
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('popstate', handleHistoryChange);
    window.addEventListener('pageshow', handlePageShow);
  }
}
