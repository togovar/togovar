import { storeManager } from '../store/StoreManager';
import type { StoreState } from '../types';

type KeyDownTarget = 'showModal' | 'selectedRow';
type KeyDownFlag = keyof Pick<StoreState, 'showModal'> | 'showSuggest';

/** StoreStateに未整理のキーも含め、キー入力ガードでは真偽値として扱えれば十分なため共通化する。 */
const getStoreFlag = (key: KeyDownFlag): boolean => {
  return Boolean(storeManager.getData<boolean>(key as keyof StoreState));
};

/** サジェスト表示中のEscapeはサジェスト側に任せるため、モーダル側のキー処理を止める。 */
const canHandleModalKeyDown = (): boolean => {
  return !getStoreFlag('showSuggest');
};

/** モーダル編集中は行選択側のショートカットと競合するため、行選択のキー処理を止める。 */
const canHandleSelectedRowKeyDown = (): boolean => {
  return !getStoreFlag('showModal');
};

/** キーボード操作の競合を避けるため、対象UIが現在キー入力を処理してよいかをStore状態から判定する。 */
export function keyDownEvent(storeName: KeyDownTarget): boolean {
  switch (storeName) {
    case 'showModal':
      return canHandleModalKeyDown();

    case 'selectedRow':
      return canHandleSelectedRowKeyDown();
  }
}
