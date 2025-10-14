import * as qs from 'qs';
import { executeSearch } from '../api/fetchData';
import { storeManager } from '../store/StoreManager';
import type {
  MasterConditions,
  MasterConditionId,
  SimpleSearchCurrentConditions,
} from '../types';

let _currentUrlParams = qs.parse(window.location.search.substring(1));

// 初期化処理を遅延実行
setTimeout(() => {
  initializeSearchMode();
}, 100);

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
  K extends keyof SimpleSearchCurrentConditions
>(conditionKey: K, conditionValue: SimpleSearchCurrentConditions[K]) {
  _setSimpleSearchConditions({ [conditionKey]: conditionValue });
}

/** シンプル検索条件を設定し、必要に応じて検索を開始 */
function _setSimpleSearchConditions(
  newSearchConditions: Partial<SimpleSearchCurrentConditions>,
  isFromHistory?: boolean
) {
  // 検索条件を更新
  const updatedConditions = {
    ...storeManager.getData('simpleSearchConditions'),
  };
  Object.keys(newSearchConditions).forEach((conditionKey) => {
    const key = conditionKey as keyof SimpleSearchCurrentConditions;
    updatedConditions[key] = newSearchConditions[key];
  });
  storeManager.setData('simpleSearchConditions', updatedConditions);

  // 現在のモードがsimpleで、履歴からの呼び出しでない場合のみURLを更新
  if (!isFromHistory && storeManager.getData('searchMode') === 'simple') {
    reflectSimpleSearchConditionToURI();
  }

  storeManager.setData('appStatus', 'searching');
  executeSearch(0, true);
}

/** 指定された検索条件キーに対応する現在の検索条件を取得する */
export function getSimpleSearchCondition(key: MasterConditionId) {
  return storeManager.getData('simpleSearchConditions')?.[key];
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
          const temp: Record<string, unknown> = {};
          for (const item of condition.items) {
            temp[item.id] = item.default;
          }
          const key = condition.id as keyof SimpleSearchCurrentConditions;
          (resetConditions as Record<string, unknown>)[key] = temp;
        }
        break;
    }
  }
  _setSimpleSearchConditions(resetConditions);
}

// 動かないからチェック
/** ブラウザの「戻る」「進む」ボタンが押されたときに検索条件を更新 */
export function handleHistoryChange(_e: PopStateEvent) {
  // 現在のURLからクエリパラメータを取得
  const urlParams = qs.parse(window.location.search.substring(1));

  // 取得したクエリパラメータを検索条件として適用
  _setSimpleSearchConditions(
    urlParams as Partial<SimpleSearchCurrentConditions>,
    true
  );
}

// Advanced Search ----------------------------------------
/** AdvancedSearch検索条件を設定し、必要に応じて検索を実行 */
export function setAdvancedSearchCondition(newSearchConditions: unknown) {
  storeManager.setData('advancedSearchConditions', newSearchConditions);
  storeManager.setData('appStatus', 'searching');

  // URLパラメータを更新
  reflectAdvancedSearchConditionToURI();

  executeSearch(0, true);
}

export function reflectAdvancedSearchConditionToURI() {
  _currentUrlParams.mode = 'advanced';
  window.history.pushState(
    _currentUrlParams,
    '',
    `${window.location.origin}${window.location.pathname}?mode=advanced`
  );
}

// アプリケーション初期化時
function initializeSearchMode() {
  const searchParams = new URLSearchParams(window.location.search);
  const urlMode = searchParams.get('mode');

  // URLのモードパラメータに基づいて検索モードを設定
  if (urlMode === 'advanced') {
    storeManager.setData('searchMode', 'advanced');
  } else {
    storeManager.setData('searchMode', 'simple');
  }
}
