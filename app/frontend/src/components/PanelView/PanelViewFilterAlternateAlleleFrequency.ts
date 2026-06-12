import PanelView from './PanelView';
import { storeManager } from '../../store/StoreManager';
import {
  setSimpleSearchCondition,
  getSimpleSearchCondition,
  getSimpleSearchConditionMaster,
} from '../../store/searchManager';
import '../RangeSlider/RangeSliderView';
import type {
  MasterConditions,
  SimpleSearchCurrentConditions,
} from '../../types';
import type { RangeSliderData } from '../RangeSlider/RangeSliderTypes';

/** アレル頻度フィルターパネルで扱う条件の型エイリアス */
type FrequencyCondition = NonNullable<SimpleSearchCurrentConditions['frequency']>;

/**
 * アレル頻度フィルターパネル。
 * RangeSlider を用いて from / to / invert / match を制御し、
 * 変更を Store に反映して検索を更新する。
 */
export default class PanelViewFilterAlternateAlleleFrequency extends PanelView {
  /** デフォルト値の参照に使用するマスター定義 */
  private _conditionMaster: MasterConditions;
  /** 生成した range-slider 要素への参照 */
  private _rangeSelectorView: RangeSliderElement;

  /** RangeSlider の生成と Store 購読を constructor に集約し、パネル初期化の流れを1箇所で把握できるようにする。 */
  constructor(elm: Element) {
    super(elm, 'frequency');

    const conditionMaster = getSimpleSearchConditionMaster('frequency');
    if (!conditionMaster) {
      throw new Error(
        '[PanelViewFilterAlternateAlleleFrequency] conditionMaster が見つかりません'
      );
    }
    this._conditionMaster = conditionMaster;

    const condition = this._getConditionFromStore();

    const rangeSlider = document.createElement('range-slider');
    rangeSlider.value1 = condition.from;
    rangeSlider.value2 = condition.to;
    rangeSlider.sliderStep = 0.01;
    rangeSlider.inputStep = 0.05;
    rangeSlider.searchType = 'simple';

    rangeSlider.addEventListener('range-changed', (e) => {
      e.stopPropagation();
      this.changeParameter(e.detail);
    });

    this.elm.querySelector<HTMLElement>('.range-selector-view')!.appendChild(rangeSlider);
    this._rangeSelectorView = rangeSlider;

    storeManager.bind('simpleSearchConditions', this);
  }

  /**
   * RangeSlider のイベント詳細を Store の frequency 条件に統合し、検索を更新する。
   * for-in ループによる暗黙の全キーコピーを避け、型安全なフィールド単位の更新にする。
   */
  changeParameter(newCondition: RangeSliderData): void {
    const current = this._getConditionFromStore();
    const updated: FrequencyCondition = {
      from: newCondition.from ?? current.from,
      to: newCondition.to ?? current.to,
      match: newCondition.match ?? current.match,
      // RangeSliderData.invert は boolean だが Store 側の frequency.invert は '0'/'1' 文字列を期待するため変換する
      invert:
        newCondition.invert !== undefined
          ? (newCondition.invert ? '1' : '0')
          : current.invert,
    };
    setSimpleSearchCondition('frequency', updated);
  }

  /**
   * Store の simpleSearchConditions が変更されたときに呼ばれるコールバック。
   * RangeSlider は内部で表示状態を管理するため、Store 変更を UI へ手動で反映する必要がない。
   * storeManager.bind で登録した購読を維持するために実装する。
   */
  simpleSearchConditions(_conditions: SimpleSearchCurrentConditions): void {
  }

  /**
   * Store から frequency 条件を取得し、未設定項目をマスターのデフォルトで補完して返す。
   * frequency の from/to は 0 が有効値のため、falsy チェックではなく nullish チェックで補完する。
   */
  private _getConditionFromStore(): FrequencyCondition {
    const stored = getSimpleSearchCondition('frequency') as
      | FrequencyCondition
      | undefined;

    const defaults = Object.fromEntries(
      (this._conditionMaster.items ?? [])
        .filter(
          (item): item is typeof item & { id: string } => item.id !== undefined
        )
        .map((item) => [item.id, item.default])
    ) as Partial<FrequencyCondition>;

    return { ...defaults, ...stored } as FrequencyCondition;
  }
}