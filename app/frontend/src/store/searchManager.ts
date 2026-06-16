import { executeSearch } from '../api/fetchData';
import { storeManager } from './StoreManager';
import type {
  MasterConditions,
  MasterConditionId,
  SimpleSearchCurrentConditions,
  SearchMode,
} from '../types';
import type { ConditionQuery } from '../types/query';
import {
  buildSimpleConditionsFromURL,
  getAdvancedConditionFromHistory,
} from './searchHistory';
import {
  parseSearchURLParams,
  reflectAdvancedSearchConditionToURI,
  reflectSimpleSearchConditionToURI,
} from './searchURL';

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
    (updatedConditions as Record<keyof SimpleSearchCurrentConditions, unknown>)[
      key
    ] = newSearchConditions[key];
  });
  storeManager.setData('simpleSearchConditions', updatedConditions);

  if (storeManager.getData('searchMode') === 'simple') {
    reflectSimpleSearchConditionToURI(updatedConditions);
  }

  _requestInitialSearch();
}

/** 指定された検索条件キーに対応する現在の検索条件を取得する */
export function getSimpleSearchCondition(key: MasterConditionId) {
  return (
    storeManager.getData('simpleSearchConditions') as Record<string, unknown>
  )?.[key];
}

/** 指定された検索条件キーに対応するマスター検索条件を取得する */
export function getSimpleSearchConditionMaster(key: MasterConditionId) {
  return storeManager
    .getData('simpleSearchConditionsMaster')
    .find((condition: MasterConditions) => condition.id === key);
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
  const urlParams = parseSearchURLParams();
  const mode = urlParams.mode as string | undefined;
  const currentMode = storeManager.getData('searchMode');

  if (mode === 'advanced') {
    // Advanced Searchの戻る/進むでURLのqパラメータを再デコードしてストアへ反映する。
    // initializeApp()は初回ロード時にしか呼ばれないため、popstate時にこちらで再デコードする。
    // URL長制限超過で q が省略された履歴エントリに戻った場合は event.state から復元する。
    const condition = getAdvancedConditionFromHistory(urlParams, e.state);
    storeManager.setData('advancedSearchConditions', condition ?? undefined);
    // false→trueのトグルでBuilderのsubscribeを確実に発火させる。
    // モード切替でBuilderがすでにロード済みの場合も再構築が必要なため常に実行する。
    storeManager.setData('advancedSearchRestoredFromURL', false);
    storeManager.setData('advancedSearchRestoredFromURL', true);

    if (currentMode === 'advanced') {
      // 同一モード内の移動: searchModeサブスクライバは発火しないため直接検索を実行する。
      _requestInitialSearch();
    } else {
      // モード切替: setSearchModeFromHistoryでreflect*ToURIをスキップしながらモードを切替える。
      storeManager.setSearchModeFromHistory('advanced');
    }
  } else {
    // URLを正本としてSimple Search条件を丸ごと構築し直す。
    // urlParamsにはmode等の非条件キーが含まれるため、マスターに存在するキーのみを適用する。
    // URLにない条件はマスターのデフォルト値に戻すことで、履歴移動後に古い条件が残るのを防ぐ。
    const fullConditions = buildSimpleConditionsFromURL(
      urlParams,
      storeManager.getData('simpleSearchConditionsMaster') ?? []
    );
    storeManager.setData('simpleSearchConditions', fullConditions);

    if (currentMode === 'simple') {
      // 同一モード内の移動: searchModeサブスクライバは発火しないため直接検索を実行する。
      _requestInitialSearch();
    } else {
      // モード切替: setSearchModeFromHistoryでreflect*ToURIをスキップしながらモードを切替える。
      storeManager.setSearchModeFromHistory('simple');
    }
  }
}

/** AdvancedSearch検索条件を設定し、必要に応じて検索を実行 */
export function setAdvancedSearchCondition(
  newSearchConditions: ConditionQuery
) {
  storeManager.setData('advancedSearchConditions', newSearchConditions);

  _reflectAdvancedSearchConditionToURI();

  _requestInitialSearch();
}

/**
 * URL長制限の判定結果だけStoreへ戻し、URL生成自体はsearchURL.tsへ委譲する。
 */
function _reflectAdvancedSearchConditionToURI() {
  const conditions = storeManager.getData('advancedSearchConditions');
  const { isURLTooLong } = reflectAdvancedSearchConditionToURI(conditions);
  storeManager.setData('advancedSearchURLTooLong', isURLTooLong);
}

// ================================================================
// searchMode の副作用ハンドラ
// ================================================================

/**
 * searchMode 変化時に DOM・URL・API の副作用を実行する subscriber。
 * Store内部の状態リセットは publish 前に実行されるため、
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
      if (!storeManager.fromHistory) {
        reflectSimpleSearchConditionToURI(
          storeManager.getData('simpleSearchConditions')
        );
      }
      // パネルUIをモード切替後の条件で再描画させるために強制 publish する
      storeManager.publish('simpleSearchConditions');
      break;
    case 'advanced':
      if (!storeManager.fromHistory) _reflectAdvancedSearchConditionToURI();
      break;
  }

  _requestInitialSearch();
}

/**
 * 仮想スクロールが未取得ページに到達したときにコンポーネントから呼ぶ。
 * Store は API を直接呼ばない設計のため、fetch のトリガーはここに集約する。
 */
export function requestNextPage(recordIndex: number): void {
  executeSearch(recordIndex);
}

/**
 * 条件変更や履歴復元では先頭ページから取り直すため、全体loadingと初回検索を必ずセットで開始する。
 */
function _requestInitialSearch(): void {
  storeManager.setData('appLoadingStatus', 'searching');
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
