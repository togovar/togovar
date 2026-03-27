import PanelView from './PanelView';
import { storeManager } from '../store/StoreManager';
import {
  setSimpleSearchCondition,
  getSimpleSearchCondition,
} from '../store/searchManager';
import type {
  MasterConditions,
  MasterConditionId,
  SimpleSearchCurrentConditions,
} from '../types';

// ----------------------------------------
// 型定義
// ----------------------------------------

/** 各チェックボックスの input 要素と件数表示 span を保持する型 */
type InputValueEntry = {
  input: HTMLInputElement;
  value: Element;
};

/** チェックリスト形式のパネルで使用される kind の値 */
type CheckListKind = Extract<
  MasterConditionId,
  'dataset' | 'type' | 'significance' | 'alphamissense' | 'sift' | 'polyphen'
>;

/** 統計情報のストアキー */
type StatisticsType =
  | 'statisticsDataset'
  | 'statisticsType'
  | 'statisticsSignificance';

// ----------------------------------------
// スコアラベルの定数
// ----------------------------------------

/** SIFT スコアのラベル */
const SIFT_LABELS: Record<string, string> = {
  D: '&lt; 0.05',
  T: '&ge; 0.05',
};

/** PolyPhen スコアのラベル */
const POLYPHEN_LABELS: Record<string, string> = {
  PROBD: '&gt; 0.908',
  POSSD: '&gt; 0.446',
  B: '&le; 0.446',
  U: 'Unknown',
};

/** AlphaMissense スコアのラベル */
const ALPHAMISSENSE_LABELS: Record<string, string> = {
  LP: '&gt; 0.564',
  A: '&ge; 0.340',
  LB: '&lt; 0.340',
};

/**
 * "Unassigned" チェックボックスを持つ kind と、
 * そのチェックボックスの value 属性のマッピング。
 */
const UNASSIGNED_VALUE: Partial<Record<CheckListKind, string>> = {
  significance: 'NC',
  alphamissense: 'N',
  sift: 'N',
  polyphen: 'N',
};

// ----------------------------------------
// クラス定義
// ----------------------------------------

/**
 * チェックリスト形式のフィルターパネル。
 * Dataset / Variant type / Clinical significance / SIFT / PolyPhen / AlphaMissense で使用される。
 */
export default class PanelViewCheckList extends PanelView {
  /** key: チェックボックスの value 属性 → { input要素, 件数span } */
  private _inputsValues: Record<string, InputValueEntry> = {};

  /**
   * @param elm - パネルのルート要素
   * @param kind - パネル種別ID (dataset | type | significance | sift | polyphen | alphamissense)
   * @param statisticsType - 統計情報のストアキー (省略時は統計表示なし)
   */
  constructor(
    elm: Element,
    kind: CheckListKind,
    statisticsType?: StatisticsType
  ) {
    super(elm, kind);

    const conditionMaster = storeManager
      .getData<MasterConditions[]>('simpleSearchConditionsMaster')
      .find((c: MasterConditions) => c.id === this.kind);

    if (!conditionMaster) {
      throw new Error(
        `[PanelViewCheckList] conditionMaster not found for kind: ${this.kind}`
      );
    }

    this._createGUI(conditionMaster);
    this._initInputsValues();
    this._changeFilter();
    this._bindEvents();
    this._bindStore(statisticsType);
  }

  // ----------------------------------------
  // 初期化処理
  // ----------------------------------------

  /** DOM から input 要素への参照を収集し、URL パラメータから初期状態を復元する */
  private _initInputsValues(): void {
    const condition = getSimpleSearchCondition(
      this.kind as MasterConditionId
    ) as Record<string, string> | undefined;

    this.elm
      .querySelectorAll<HTMLInputElement>(
        '.content > .checklist-values > .item > .label > input'
      )
      .forEach((input) => {
        this._inputsValues[input.value] = {
          input,
          value: (input.parentNode as Element).nextElementSibling as Element,
        };
        // URL パラメータに値があればチェック状態を復元
        if (condition?.[input.value]) {
          input.checked = condition[input.value] === '1';
        }
      });
  }

  /** 各チェックボックスに change イベントを登録する */
  private _bindEvents(): void {
    for (const entry of Object.values(this._inputsValues)) {
      entry.input.addEventListener('change', this._changeFilter.bind(this));
    }
  }

  /**
   * ストアの変更購読を登録する。
   * statisticsType が指定されている場合は統計情報の更新も購読する。
   *
   * storeManager.bind(key, observer) は、ストアの key が更新されると
   * observer[key](newValue) を呼び出す仕組みのため、
   * statisticsType と同名のメソッドを動的に登録する必要がある。
   */
  private _bindStore(statisticsType?: StatisticsType): void {
    storeManager.bind('simpleSearchConditions', this);

    if (statisticsType) {
      storeManager.bind(statisticsType, this);
      // storeManager が observer[statisticsType](values) を呼べるよう、
      // インスタンスに同名のメソッドを動的に設定する
      (this as Record<string, unknown>)[statisticsType] =
        this._updateStatistics.bind(this);
    }
  }

  // ----------------------------------------
  // GUI 生成
  // ----------------------------------------

  /** チェックボックス一覧の HTML を生成して DOM に挿入する */
  private _createGUI(conditionMaster: MasterConditions): void {
    const unassignedValue = UNASSIGNED_VALUE[this.kind as CheckListKind];

    let html = this._buildAllItemHtml();

    // significance / alphamissense / sift / polyphen は
    // マスターデータとは別に "Unassigned" チェックボックスを先頭に追加する
    if (unassignedValue) {
      html += this._buildUnassignedItemHtml(unassignedValue);
    }

    html += (conditionMaster.items ?? [])
      .map((item) => this._buildMasterItemHtml(item.id!, item.label))
      .join('');

    this.elm
      .querySelector('.content > .checklist-values')!
      .insertAdjacentHTML('beforeend', html);

    // マスターデータにも Unassigned 相当のアイテムが含まれているため、重複を削除する
    if (unassignedValue) {
      this.elm
        .querySelector('.content > .checklist-values > .item:nth-child(5)')!
        .remove();
    }
  }

  /** "All" チェックボックスの HTML を返す */
  private _buildAllItemHtml(): string {
    return `
    <li class="item">
      <label class="label">
        <input type="checkbox" value="all">
        All
      </label>
      <span class="value"></span>
    </li>
    <li class="separator"><hr></li>
    `;
  }

  /** "Unassigned" チェックボックスの HTML を返す */
  private _buildUnassignedItemHtml(value: string): string {
    return `
    <li class="item">
      <label class="label">
        <input type="checkbox" value="${value}">
        Unassigned
      </label>
      <span class="value"></span>
    </li>
    <li class="separator"><hr></li>
    `;
  }

  /** マスターデータの 1 アイテム分のチェックボックス HTML を返す */
  private _buildMasterItemHtml(id: string, label: string): string {
    return `
    <li class="item">
      <label class="label">
        <input type="checkbox" value="${id}">
        ${this._buildKindSpecificHtml(id)}
        ${label}
      </label>
      <span class="value"></span>
    </li>
    `;
  }

  /** kind ごとのアイコン・スコア表示 HTML を返す */
  private _buildKindSpecificHtml(id: string): string {
    switch (this.kind) {
      case 'dataset':
        return `<div class="dataset-icon" data-dataset="${id}"><div class="properties"></div></div>`;
      case 'significance':
        return `<div class="clinical-significance" data-value="${id}"></div>`;
      case 'sift':
        return `<div class="variant-function _width_5em _align-center" data-function="${id}">${SIFT_LABELS[id] ?? ''}</div>`;
      case 'polyphen':
        return `<div class="variant-function _width_5em _align-center" data-function="${id}">${POLYPHEN_LABELS[id] ?? ''}</div>`;
      case 'alphamissense':
        return `<div class="variant-function _width_5em _align-center" data-function="${id}">${ALPHAMISSENSE_LABELS[id] ?? ''}</div>`;
      default:
        return '';
    }
  }

  // ----------------------------------------
  // イベント・ストア処理
  // ----------------------------------------

  /** チェックボックスが変更されたときにフィルター状態を更新する */
  private _changeFilter(e?: Event): void {
    if (e && (e.target as HTMLInputElement).value === 'all') {
      const isChecked = (e.target as HTMLInputElement).checked;
      for (const entry of Object.values(this._inputsValues)) {
        entry.input.checked = isChecked;
      }
    } else {
      const allChecked = Object.entries(this._inputsValues)
        .filter(([key]) => key !== 'all')
        .every(([, entry]) => entry.input.checked);
      this._inputsValues.all.input.checked = allChecked;
    }

    const entries = Object.entries(this._inputsValues).filter(
      ([key]) => key !== 'all'
    );

    // ↓ ここが修正ポイント
    const anyChecked = entries.some(([, entry]) => entry.input.checked);
    const checked: Record<string, string> = {};

    if (anyChecked) {
      // 1つでもチェックがあれば、チェックなしのものだけ =0 で送る（既存の動作）
      for (const [key, entry] of entries) {
        checked[key] = entry.input.checked ? '1' : '0';
      }
    }
    // 全チェックなしの場合は checked が空 → パラメータなし → フィルターなし（全件表示）

    setSimpleSearchCondition(
      this.kind as CheckListKind,
      checked as SimpleSearchCurrentConditions[CheckListKind]
    );
  }

  /**
   * ストアの simpleSearchConditions が更新されたときに UI に反映する。
   * storeManager.bind によって自動的に呼び出される。
   */
  simpleSearchConditions(
    conditions: Record<string, Record<string, string>>
  ): void {
    const kindConditions = conditions[this.kind] ?? {};
    let uncheckedCount = 0;

    for (const [key, value] of Object.entries(kindConditions)) {
      if (!this._inputsValues[key]) continue;
      const isChecked = value !== '0';
      this._inputsValues[key].input.checked = isChecked;
      if (!isChecked) uncheckedCount++;
    }

    this._inputsValues.all.input.checked = uncheckedCount === 0;
  }

  /**
   * 統計情報が更新されたときに件数表示を更新する。
   * storeManager.bind によって statisticsType の名前で自動的に呼び出される。
   */
  private _updateStatistics(values: Record<string, number> | null): void {
    if (values) {
      let total = 0;
      for (const [key, entry] of Object.entries(this._inputsValues)) {
        const count = values[key] ?? 0;
        total += count;
        entry.value.textContent = count.toLocaleString();
      }
      this._inputsValues.all.value.textContent = total.toLocaleString();
    } else {
      // 統計情報が未取得の場合は N/A を表示
      for (const entry of Object.values(this._inputsValues)) {
        entry.value.textContent = 'N/A';
      }
    }

    // "All" の件数は検索ステータスの filtered 件数で上書きする
    this._inputsValues.all.value.textContent = storeManager
      .getData('searchStatus')
      .filtered.toLocaleString();
  }
}
