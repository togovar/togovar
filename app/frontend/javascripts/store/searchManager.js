import qs from 'qs';
import { executeSearch } from '../api/fetchData.js'
import StoreManager from '../store/StoreManager';

let _currentUrlParams = qs.parse(window.location.search.substring(1));

/** SimpleSearchの検索条件を設定
* @param {string} conditionKey - 設定する条件のキー
* @param {*} conditionValue - 設定する条件の値 */
export function setSimpleSearchCondition(conditionKey, conditionValue) {
  _setSimpleSearchConditions({ [conditionKey]: conditionValue });
}

/** シンプル検索条件を設定し、必要に応じて検索を開始
* @param {Object} newSearchConditions - 新しい検索条件
* @param {boolean} isFromHistory - 履歴からの呼び出しかどうか */
export function _setSimpleSearchConditions(newSearchConditions, isFromHistory) {
  // 検索条件を更新
  Object.keys(newSearchConditions).forEach((conditionKey) => {
    StoreManager._store.simpleSearchConditions[conditionKey] = newSearchConditions[conditionKey];
  });

  // 履歴からの呼び出しでない場合、URLパラメータを更新
  if (!isFromHistory) reflectSimpleSearchConditionToURI();

  StoreManager.notify('simpleSearchConditions');
  StoreManager.setData('appStatus', 'searching');

  executeSearch(0, true);
}

/** AdvancedSearch検索条件を設定し、必要に応じて検索を実行
* @param {Object} newSearchConditions - 新しい高度な検索条件
* @param {boolean} isFromHistory - 履歴からの呼び出しかどうか */
export function setAdvancedSearchCondition(newSearchConditions, isFromHistory) {
  StoreManager._store.advancedSearchConditions = newSearchConditions;
  // convert queries to URL parameters
  if (!isFromHistory) _reflectAdvancedSearchConditionToURI();
  StoreManager.notify('advancedSearchConditions');
  StoreManager.setData('appStatus', 'searching');

  executeSearch(0, true);
}

export function resetSimpleSearchConditions() {
  const simpleSearchConditionsMaster = StoreManager.getData(
    'simpleSearchConditionsMaster'
  ),
    resetConditions = {};
  for (const condition of simpleSearchConditionsMaster) {
    switch (condition.type) {
      case 'string':
      case 'boolean':
        if (condition.id !== 'term')
          resetConditions[condition.id] = condition.default;
        break;
      case 'array':
        {
          const temp = {};
          for (const item of condition.items) {
            temp[item.id] = item.default;
          }
          resetConditions[condition.id] = temp;
        }
        break;
    }
  }
  _setSimpleSearchConditions(resetConditions);
}

export function getSimpleSearchCondition(key) {
  return StoreManager._copy(StoreManager._store.simpleSearchConditions[key]);
}

// getAdvancedSearchCondition(key) {
//   return this._copy(this._store.advancedSearchConditions[key]);
// },

export function getSimpleSearchConditionMaster(key) {
  return StoreManager.getData('simpleSearchConditionsMaster').find(
    (condition) => condition.id === key
  );
}

/** デフォルト値と異なる検索条件を抽出
 * @param {Object} currentConditions - 現在の検索条件(URLパラメータから取得)
 * @returns {Object} デフォルト値と異なる検索条件のみを含むオブジェクト */
export function extractSearchCondition(currentConditions) {
  const masterConditions = StoreManager.getData('simpleSearchConditionsMaster');
  const diffConditions = {};

  currentConditions = currentConditions ?? {}

  Object.keys(currentConditions).forEach((conditionKey) => {
    // マスターデータから該当する条件idを検索
    const masterCondition = masterConditions.find(
      (condition) => condition.id === conditionKey
    );

    // 一致するスターデータが存在する場合のみ処理
    if (masterCondition) {
      switch (masterCondition.type) {

        case 'array': {
          const filteredArray = {};
          Object.keys(currentConditions[conditionKey]).forEach((itemKey) => {
            const currentValue = currentConditions[conditionKey][itemKey];
            const defaultValue = masterCondition.items.find(
              (item) => item.id === itemKey
            )?.default;

            // デフォルト値と異なる場合のみ抽出
            if (currentValue !== defaultValue) {
              filteredArray[itemKey] = currentValue;
            }
          });

          // 差分がある場合にのみ結果に追加
          if (Object.keys(filteredArray).length > 0) {
            diffConditions[conditionKey] = filteredArray;
          }
          break;
        }

        case 'boolean':
        case 'string': {
          const currentValue = currentConditions[conditionKey];
          const defaultValue = masterCondition.default;
          // デフォルト値と異なる場合のみ結果に追加
          if (currentValue !== defaultValue) {
            diffConditions[conditionKey] = currentValue;
          }
          break;
        }
      }
    }
  });

  return diffConditions;
}

/** 現在のSimple Searchの条件をURLパラメータに反映する */
export function reflectSimpleSearchConditionToURI() {
  // デフォルト値と異なる検索条件を抽出
  const currentConditions = StoreManager._store.simpleSearchConditions;
  const diffConditions = extractSearchCondition(currentConditions);

  //現在のURLパラメータを初期化して検索モードを設定
  _currentUrlParams = { mode: 'simple' };

  // 差分条件をURLパラメータに統合
  Object.assign(_currentUrlParams, diffConditions);

  //URLを更新 (ブラウザの履歴に新しい状態を追加)
  const newUrl = `${window.location.origin}${window.location.pathname}?${qs.stringify(_currentUrlParams)}`;
  window.history.pushState(_currentUrlParams, '', newUrl);
}

function _reflectAdvancedSearchConditionToURI() {
  _currentUrlParams.mode = 'advanced';
  window.history.pushState(
    _currentUrlParams,
    '',
    `${window.location.origin}${window.location.pathname}?mode=advanced`
  );
}

// 動かないからチェック
/** ブラウザの「戻る」「進む」ボタンが押されたときに検索条件を更新
* @param {Event} event - popstate イベント */
export function handleHistoryChange(_e) {
  // 現在のURLからクエリパラメータを取得
  const urlParams = qs.parse(window.location.search.substring(1));

  // 取得したクエリパラメータを検索条件として適用
  _setSimpleSearchConditions(urlParams, true);
}
