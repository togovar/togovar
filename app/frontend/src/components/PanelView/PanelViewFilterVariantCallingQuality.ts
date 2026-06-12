import PanelView from './PanelView';
import { storeManager } from '../../store/StoreManager';
import {
  setSimpleSearchCondition,
  getSimpleSearchCondition,
} from '../../store/searchManager';
import type { SimpleSearchCurrentConditions } from '../../types';

/**
 * バリアントコール品質フィルターパネル。
 * チェックボックス1つで quality 条件の有無を切り替える。
 */
export default class PanelViewFilterVariantCallingQuality extends PanelView {
  /** Store 変更の反映と change イベント処理に使うチェックボックス要素への参照 */
  private readonly _checkbox: HTMLInputElement;

  /** チェックボックスの取得・イベント登録・Store 購読を constructor にまとめ、初期化の流れを一箇所で把握できるようにする。 */
  constructor(elm: Element) {
    super(elm, 'quality');

    storeManager.bind('simpleSearchConditions', this);

    this._checkbox = this.elm.querySelector<HTMLInputElement>(
      '.content > label > input'
    )!;

    // URLパラメータ等で復元済みの値があればそれを優先し、未設定ならデフォルト（チェック済み＝フィルターなし）とする
    const condition = getSimpleSearchCondition('quality');
    this._checkbox.checked = condition === undefined ? true : condition === '1';
    this._checkbox.addEventListener('change', (e) => this._change(e));
  }

  /**
   * チェック状態を '1'/'0' の文字列に変換して Store へ反映する。
   * quality の仕様上 boolean ではなく文字列で管理するため、ここで変換する。
   */
  private _change(e: Event): void {
    if (!(e.target instanceof HTMLInputElement)) return;
    setSimpleSearchCondition('quality', e.target.checked ? '1' : '0');
  }

  /**
   * Store の simpleSearchConditions が変更されたときに UI へ反映する。
   * storeManager.bind で登録した購読コールバックとして呼ばれる。
   */
  simpleSearchConditions(conditions: SimpleSearchCurrentConditions): void {
    if (conditions.quality !== undefined) {
      this._checkbox.checked = conditions.quality === '1';
    }
  }
}
