import CollapseView from './CollapseView.js';
import PanelView from './PanelView';
import { storeManager } from '../store/StoreManager';
import {
  setSimpleSearchCondition,
  getSimpleSearchCondition,
  getSimpleSearchConditionMaster,
} from '../store/searchManager';
import type {
  MasterConditions,
  MasterConditionItem,
  ItemItemClass,
  SimpleSearchCurrentConditions,
} from '../types';

// ----------------------------------------
// 型定義
// ----------------------------------------

type InputValueEntry = {
  input: HTMLInputElement;
  value: Element;
  /** 入れ子構造を持つグループノードの場合、配下のリーフキー一覧 */
  values?: string[];
};

// ----------------------------------------
// 定数
// ----------------------------------------

const KIND_OF_CONDITION = 'consequence' as const;

// ----------------------------------------
// クラス定義
// ----------------------------------------

/**
 * Consequence フィルターパネル（階層チェックリスト）。
 */
export default class PanelViewFilterConsequence extends PanelView {
  private _inputsValues: Record<string, InputValueEntry> = {};

  constructor(elm: Element) {
    super(elm, 'consequence');

    const conditionMaster = getSimpleSearchConditionMaster('consequence');
    const grouping = getSimpleSearchConditionMaster('consequence_grouping')
      .items as Array<ItemItemClass | string>;

    // GUI 生成
    this._createGUI(conditionMaster, grouping);

    // CollapseView の初期化
    elm
      .querySelectorAll('.collapse-view')
      .forEach((collapseView) => new CollapseView(collapseView));

    // input 要素への参照を収集
    const condition = getSimpleSearchCondition(KIND_OF_CONDITION) as
      | Record<string, string>
      | undefined;

    const hasActiveFilter =
      condition !== undefined && Object.keys(condition).length > 0;

    this._inputsValues = {};
    this.elm
      .querySelectorAll<HTMLInputElement>('.content > .checklist-values input')
      .forEach((input) => {
        this._inputsValues[input.value] = {
          input,
          value: (input.parentNode as Element).nextElementSibling as Element,
        };
        if (hasActiveFilter) {
          // フィルター有効時: '0' = 未チェック、conditionにないアイテムはチェック済み
          input.checked = condition![input.value] !== '0';
        }
        // condition が undefined または空 → チェックなし（フィルターなし）
      });

    // 入れ子グループの子キーを収集
    this._collectGroupValues(grouping);
    this._updateNestedCheckboxes();

    // イベント登録
    for (const key of Object.keys(this._inputsValues)) {
      this._inputsValues[key].input.addEventListener(
        'change',
        this._changeFilter.bind(this)
      );
    }

    // Clear ボタン
    const clearBtn = elm.querySelector<HTMLButtonElement>('.clear-button');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        for (const entry of Object.values(this._inputsValues)) {
          entry.input.checked = false;
        }
        this._changeFilter(null);
      });
    }

    storeManager.bind('simpleSearchConditions', this);
    storeManager.bind('statisticsConsequence', this);
  }

  // ----------------------------------------
  // GUI 生成
  // ----------------------------------------

  private _createGUI(
    conditionMaster: MasterConditions,
    grouping: Array<ItemItemClass | string>
  ): void {
    const html = grouping
      .map((group) => this._render(conditionMaster, group))
      .join('');
    this.elm
      .querySelector('.content > .checklist-values')!
      .insertAdjacentHTML('beforeend', html);

    // transcript variant グループは開いた状態にする
    this.elm
      .querySelector('.content > .checklist-values > .item:nth-child(1)')!
      .classList.remove('-collapsed');
  }

  private _render(
    conditionMaster: MasterConditions,
    item: ItemItemClass | string
  ): string {
    const hasChildren = typeof item === 'object';
    const resolved: MasterConditionItem = hasChildren
      ? (item as unknown as MasterConditionItem)
      : conditionMaster.items!.find((c) => c.id === item)!;

    const childItems = hasChildren ? (item as ItemItemClass).items : undefined;
    const value = resolved.id ? resolved.id : resolved.label;

    return `
      <li class="item${hasChildren ? ' collapse-view -hierarchic -collapsed' : ''}">
        ${hasChildren ? '<div class="collapsebutton"></div>' : ''}
        <label class="label">
          <input type="checkbox" value="${value}" data-has-children="${childItems ? 'true' : 'false'}">
          ${resolved.label}
        </label>
        <span class="value"></span>
        ${
          childItems
            ? `<ul class="checklist-values collapsecontent">
                ${childItems.map((child) => this._render(conditionMaster, child)).join('')}
               </ul>`
            : ''
        }
      </li>
    `;
  }

  // ----------------------------------------
  // 入れ子グループのリーフキー収集
  // ----------------------------------------

  private _collectGroupValues(items: Array<ItemItemClass | string>): string[] {
    const leafKeys: string[] = [];
    for (const item of items) {
      if (typeof item === 'object') {
        const childLeaves = this._collectGroupValues(
          item.items as Array<ItemItemClass | string>
        );
        const groupKey = (item as unknown as { label: string }).label;
        if (this._inputsValues[groupKey]) {
          this._inputsValues[groupKey].values = childLeaves;
        }
        leafKeys.push(...childLeaves);
      } else {
        leafKeys.push(item);
      }
    }
    // ルートの呼び出し元（all グループ）への参照は不要なので返すだけ
    return leafKeys;
  }

  // ----------------------------------------
  // イベント・ストア処理
  // ----------------------------------------

  private _changeFilter(e: Event | null): void {
    if (e && (e.target as HTMLInputElement).dataset.hasChildren === 'true') {
      // グループチェックボックス → 配下のリーフを連動
      const target = e.target as HTMLInputElement;
      for (const leafKey of this._inputsValues[target.value].values ?? []) {
        this._inputsValues[leafKey].input.checked = target.checked;
      }
    } else if (e) {
      this._updateNestedCheckboxes();
    }

    // リーフのみ対象にして checked を構築
    const leafEntries = Object.entries(this._inputsValues).filter(
      ([, entry]) => entry.values === undefined
    );

    const anyChecked = leafEntries.some(([, entry]) => entry.input.checked);
    const allChecked = leafEntries.every(([, entry]) => entry.input.checked);
    const checked: Record<string, string> = {};

    if (anyChecked && !allChecked) {
      // 一部だけチェックの場合のみフィルターを適用
      for (const [key, entry] of leafEntries) {
        checked[key] = entry.input.checked ? '1' : '0';
      }
    }
    // 全チェックなし or 全チェックの場合は checked が空 → フィルターなし（全件表示）

    setSimpleSearchCondition(
      KIND_OF_CONDITION,
      checked as SimpleSearchCurrentConditions['consequence']
    );
  }

  /** グループノードのチェック状態を配下のリーフに基づいて更新する */
  private _updateNestedCheckboxes(): void {
    for (const [, entry] of Object.entries(this._inputsValues)) {
      if (entry.values) {
        entry.input.checked = entry.values.every(
          (leafKey) => this._inputsValues[leafKey].input.checked
        );
      }
    }
  }

  // ----------------------------------------
  // ストアからの更新
  // ----------------------------------------

  /** simpleSearchConditions ストア更新時に呼ばれる */
  simpleSearchConditions(
    conditions: Record<string, Record<string, string>>
  ): void {
    const kindConditions = conditions[KIND_OF_CONDITION] ?? {};

    if (Object.keys(kindConditions).length === 0) {
      // デフォルト or Clear → 全チェックなし
      for (const entry of Object.values(this._inputsValues)) {
        entry.input.checked = false;
      }
    } else {
      // URLに存在しないキー = チェックあり（除外指定されていない）
      // URLに =0 があるキー = チェックなし
      for (const [key, entry] of Object.entries(this._inputsValues)) {
        entry.input.checked = kindConditions[key] !== '0';
      }
    }
    this._updateNestedCheckboxes();
  }

  /** statisticsConsequence ストア更新時に呼ばれる */
  statisticsConsequence(values: Record<string, number> | null): void {
    if (values) {
      for (const [key, entry] of Object.entries(this._inputsValues)) {
        if (entry.values === undefined) {
          entry.value.textContent = (values[key] ?? 0).toLocaleString();
        }
      }
    } else {
      for (const [, entry] of Object.entries(this._inputsValues)) {
        if (entry.values === undefined) {
          entry.value.textContent = '0';
        }
      }
    }
  }
}
