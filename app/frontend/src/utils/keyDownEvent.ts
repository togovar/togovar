import { storeManager } from '../store/StoreManager';
import type { StoreState } from '../types';

type KeyDownTarget = 'showModal' | 'selectedRow';

/**
 * サジェスト表示中の Escape はサジェスト側に任せるため、モーダル側のキー処理を止める。
 * showSuggest は StoreState の管理対象外なので、DOM から直接 showSuggestions プロパティを読む。
 */
const canHandleModalKeyDown = (): boolean => {
  const el = document.querySelector<SearchFieldWithSuggestionsElement>(
    'search-field-with-suggestions'
  );
  return el === null || !el.showSuggestions;
};

/** モーダル編集中は行選択側のショートカットと競合するため、行選択のキー処理を止める。 */
const canHandleSelectedRowKeyDown = (): boolean => {
  return !storeManager.getData<boolean>('showModal' as keyof StoreState);
};

/** キーボード操作の競合を避けるため、対象UIが現在キー入力を処理してよいかをStore状態から判定する。 */
export function keyDownEvent(storeName: KeyDownTarget): boolean {
  switch (storeName) {
    case 'showModal':
      return canHandleModalKeyDown();

    case 'selectedRow':
      return canHandleSelectedRowKeyDown();

    default: {
      const _exhaustive: never = storeName;
      throw new Error(`Unexpected KeyDownTarget: ${_exhaustive}`);
    }
  }
}
