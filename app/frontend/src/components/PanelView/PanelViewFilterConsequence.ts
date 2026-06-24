import PanelView from './PanelView';
import { storeManager } from '../../store/StoreManager';
import {
  setSimpleSearchCondition,
  getSimpleSearchCondition,
  getSimpleSearchConditionMaster,
} from '../../store/searchManager';
import type {
  MasterConditions,
  MasterConditionItem,
  ItemItemClass,
  SimpleSearchCurrentConditions,
} from '../../types';

// ----------------------------------------
// 型定義
// ----------------------------------------

type CheckboxEntry = {
  input: HTMLInputElement;
  /** <span class="count-display"> — 件数を表示する要素 */
  countDisplay: Element;
  /**
   * グループノードの場合のみ存在する。
   * チェック連動・フィルター集計の対象となる配下リーフの value キー一覧。
   */
  leafKeys?: string[];
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
  private _entries: Record<string, CheckboxEntry> = {};

  constructor(elm: Element) {
    super(elm, 'consequence');

    const conditionMaster = getSimpleSearchConditionMaster('consequence')!;
    const grouping = getSimpleSearchConditionMaster('consequence_grouping')!
      .items as Array<ItemItemClass | string>;

    this._createGUI(conditionMaster, grouping);
    this._initEntries(grouping);
    this._changeFilter();
    this._bindEvents(elm);
    this._bindStore();
  }

  // ----------------------------------------
  // 初期化処理
  // ----------------------------------------

  /** DOM から input 要素への参照を収集し、URL パラメータから初期状態を復元する */
  private _initEntries(grouping: Array<ItemItemClass | string>): void {
    const condition = getSimpleSearchCondition(KIND_OF_CONDITION) as
      | Record<string, string>
      | undefined;

    const hasActiveFilter =
      condition !== undefined && Object.keys(condition).length > 0;

    this.elm
      .querySelectorAll<HTMLInputElement>('.content > .checklist-values input')
      .forEach((input) => {
        this._entries[input.value] = {
          input,
          countDisplay: (input.parentNode as Element)
            .nextElementSibling as Element,
        };
        if (hasActiveFilter) {
          // フィルター有効時: '0' = 未チェック、conditionにないアイテムはチェック済み
          input.checked = condition![input.value] !== '0';
        }
        // condition が undefined または空 → チェックなし（フィルターなし）
      });

    this._collectLeafKeys(grouping);
    this._updateNestedCheckboxes();
  }

  /** 各チェックボックスと Clear ボタンにイベントを登録する */
  private _bindEvents(elm: Element): void {
    for (const entry of Object.values(this._entries)) {
      entry.input.addEventListener('change', this._changeFilter.bind(this));
    }

    const clearBtn = elm.querySelector<HTMLButtonElement>('.clear-button');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // パネル開閉を発火させない
        for (const entry of Object.values(this._entries)) {
          entry.input.checked = false;
        }
        this._changeFilter();
      });
    }
  }

  /** ストアの変更購読を登録する */
  private _bindStore(): void {
    storeManager.subscribe('simpleSearchConditions', (v) =>
      this.simpleSearchConditions(v)
    );
    storeManager.subscribe('statisticsConsequence', (v) =>
      this.statisticsConsequence(v ?? null)
    );
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

    // Transcript variant グループは初期状態で展開しておく
    const transcriptDetail = this.elm.querySelector<HTMLDetailsElement>(
      '.content > .checklist-values > .item[data-group="Transcript variant"] > details'
    );
    if (transcriptDetail) transcriptDetail.open = true;
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
    const checkboxValue = resolved.id ? resolved.id : resolved.label;

    return `
      <li class="item${hasChildren ? ' -hierarchic' : ''}"${hasChildren ? ` data-group="${resolved.label}"` : ''}>
        <label class="label">
          <input type="checkbox" value="${checkboxValue}" data-has-children="${childItems ? 'true' : 'false'}">
          ${resolved.label}
        </label>
        <span class="count-display"></span>
        ${
          childItems
            ? `<details>
                <summary aria-label="Toggle ${resolved.label}"></summary>
                <ul class="checklist-values">
                  ${childItems.map((child) => this._render(conditionMaster, child)).join('')}
                </ul>
              </details>`
            : ''
        }
      </li>
    `;
  }

  // ----------------------------------------
  // 入れ子グループのリーフキー収集
  // ----------------------------------------

  /** グループノードの `leafKeys` に配下のリーフ value キーを再帰的に収集する */
  private _collectLeafKeys(items: Array<ItemItemClass | string>): string[] {
    const leafKeys: string[] = [];
    for (const item of items) {
      if (typeof item === 'object') {
        const childLeaves = this._collectLeafKeys(
          item.items as Array<ItemItemClass | string>
        );
        const groupKey = (item as unknown as { label: string }).label;
        if (this._entries[groupKey]) {
          this._entries[groupKey].leafKeys = childLeaves;
        }
        leafKeys.push(...childLeaves);
      } else {
        leafKeys.push(item);
      }
    }
    return leafKeys;
  }

  // ----------------------------------------
  // イベント・ストア処理
  // ----------------------------------------

  private _changeFilter(_e?: Event): void {
    if (_e) {
      const target = _e.target as HTMLInputElement;
      if (target.dataset.hasChildren === 'true') {
        // グループチェックボックス → 配下のリーフを連動
        for (const leafKey of this._entries[target.value].leafKeys ?? []) {
          this._entries[leafKey].input.checked = target.checked;
        }
      }
      this._updateNestedCheckboxes();
    }

    // リーフのみ対象にして checked を構築
    const leafEntries = Object.entries(this._entries).filter(
      ([, entry]) => entry.leafKeys === undefined
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
    for (const entry of Object.values(this._entries)) {
      if (entry.leafKeys) {
        entry.input.checked = entry.leafKeys.every(
          (leafKey) => this._entries[leafKey].input.checked
        );
      }
    }
  }

  // ----------------------------------------
  // ストアからの更新
  // ----------------------------------------

  /** simpleSearchConditions ストア更新時に呼ばれる */
  simpleSearchConditions(conditions: SimpleSearchCurrentConditions): void {
    const kindConditions = conditions[KIND_OF_CONDITION] ?? {};

    if (Object.keys(kindConditions).length === 0) {
      // デフォルト or Clear → 全チェックなし
      for (const entry of Object.values(this._entries)) {
        entry.input.checked = false;
      }
    } else {
      // URLに存在しないキー = チェックあり（除外指定されていない）
      // URLに =0 があるキー = チェックなし
      for (const [key, entry] of Object.entries(this._entries)) {
        entry.input.checked = kindConditions[key] !== '0';
      }
    }
    this._updateNestedCheckboxes();
  }

  /** statisticsConsequence ストア更新時に呼ばれる */
  statisticsConsequence(values: Record<string, number> | null): void {
    for (const [key, entry] of Object.entries(this._entries)) {
      if (entry.leafKeys !== undefined) continue; // グループノードは件数表示しない
      entry.countDisplay.textContent = values
        ? (values[key] ?? 0).toLocaleString()
        : '0';
    }
  }
}
