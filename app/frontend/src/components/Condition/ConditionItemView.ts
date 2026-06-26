import { BaseConditionView } from './ConditionView';
import ConditionValues from './ConditionValues';
import { storeManager } from '../../store/StoreManager';
import {
  CONDITION_NODE_KIND,
  type AdvancedConditionTypeValue,
  supportsRelation,
  type NoRelationType,
  type KeysWithRelation,
} from '../../advancedCondition';
import { ADVANCED_CONDITIONS } from '../../global';
import { keyDownEvent } from '../../utils/keyDownEvent';
import { buildQueryFragment } from './queryBuilders';
import { createEl } from '../../utils/dom/createEl';
import { ConditionItemHydrator } from './ConditionItemHydrator';
import type { AdvancedSearchBuilderView } from '../AdvancedSearch/AdvancedSearchBuilderView';
import type { ConditionGroupView } from './ConditionGroupView';
import type {
  ConditionQuery,
  Relation,
  ConditionDefinition,
  RestoredConditionValue,
} from '../../types';
import type { ConditionItemValueView } from './ConditionItemValueView';

/**
 * 1条件行の View。編集・削除・relation切り替えのイベントと、
 * URLからの値復元（hydrate）を担う。
 */
export class ConditionItemView extends BaseConditionView {
  readonly conditionNodeKind = CONDITION_NODE_KIND.condition;

  private readonly _conditionType: AdvancedConditionTypeValue;
  private readonly _relationSupported: boolean;

  private _isFirstTime = true;
  // Escapeでキャンセルするときに戻すための直前のrelation値。
  private _keepLastRelation: Relation = 'eq';

  private _conditionHeaderEl!: HTMLDivElement;
  private _relationEl!: HTMLDivElement;
  private _valuesContainerEl!: HTMLDivElement;
  private _btnEdit!: HTMLButtonElement;
  private _btnDelete!: HTMLButtonElement;
  private _editorEl!: HTMLDivElement;
  private _conditionLabelEl!: HTMLDivElement;

  private _conditionValues!: ConditionValues;

  /** このインスタンスが登録したリスナーをまとめて解除するController。 */
  private readonly _events = new AbortController();

  constructor(
    builder: AdvancedSearchBuilderView,
    parentGroup: ConditionGroupView,
    conditionType: AdvancedConditionTypeValue,
    referenceElm: Node | null = null,
    options?: unknown
  ) {
    super(
      builder,
      parentGroup.container,
      referenceElm ?? document.createTextNode('')
    );

    this._conditionType = conditionType;
    this._relationSupported = supportsRelation(conditionType);

    this._initializeHTML();
    this._conditionValues = new ConditionValues(this, options);
    this._attachEventDelegation();
    // 条件追加時は即座に編集モードへ入り、ユーザーが値を選択できる状態にする。
    this._enterEditMode();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────────

  /** 編集モードを終了し、条件の変更をBuilderへ通知する。 */
  doneEditing(): void {
    this.rootEl.classList.remove('-editing');
    this._isFirstTime = false;
    this._toggleGlobalKeydown(false);
    storeManager.setData('showModal', false);
    this._builder.changeCondition();
  }

  remove(): void {
    this._toggleGlobalKeydown(false);
    this._events.abort();
    storeManager.setData('showModal', false);
    this._conditionValues?.destroy();
    super.remove();
  }

  updateClassificationText(newText: string): void {
    if (this._conditionLabelEl) {
      this._conditionLabelEl.textContent = newText;
    }
  }

  /**
   * URLから復元した値をこの条件行へ反映する。
   *
   * 通常の編集フローを経ずに直接値を注入するため、
   * 完了後は編集モードを閉じ isFirstTime を false にする。
   */
  async hydrateFromRestoredQuery(options: {
    relation?: Relation;
    values: RestoredConditionValue[];
  }): Promise<void> {
    // constructorの_enterEditModeの副作用をawaitより前に即座に打ち消す。
    // awaitを跨いだままだとモーダル/編集UIが一瞬表示されEscハンドラも有効になる。
    this.rootEl.classList.remove('-editing');
    this._isFirstTime = false;
    this._toggleGlobalKeydown(false);
    storeManager.setData('showModal', false);

    this._setRelation(options.relation);
    // 復元したrelationをキャンセル時の復元先としても保持する。
    // 保持しないとEsc/Cancelでeqにリセットされてしまう。
    if (this._relationSupported)
      this._keepLastRelation = options.relation ?? 'eq';

    await new ConditionItemHydrator(
      this._conditionType,
      this._valuesContainerEl
    ).hydrate(options.values);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Accessors
  // ───────────────────────────────────────────────────────────────────────────

  /** この条件行が対象とする条件種別。生成後は変わらないためreadonlyで保持する。 */
  get conditionType(): AdvancedConditionTypeValue {
    return this._conditionType;
  }
  /** 条件値要素（condition-item-value-view）を並べるコンテナ。エディタが値を追加・取得するために参照する。 */
  get valuesContainerEl(): HTMLDivElement {
    return this._valuesContainerEl;
  }
  /** OK/CancelボタンとエディタのDOMを配置する要素。ConditionValuesが自身のDOMをここへ挿入する。 */
  get editorElement(): HTMLDivElement {
    return this._editorEl;
  }
  /** 初回追加フラグ。Cancelで値を戻すか条件行ごと削除するかの分岐に使う。 */
  get isFirstTime(): boolean {
    return this._isFirstTime;
  }
  /** CancelやEscapeで元に戻すrelationの基準値。編集確定時・hydrate時に更新する。 */
  get keepLastRelation(): Relation {
    return this._keepLastRelation;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Query building
  // ───────────────────────────────────────────────────────────────────────────

  /** DOMの現在状態からクエリを組み立てる。 */
  get queryFragment(): ConditionQuery {
    const values = Array.from(
      this._valuesContainerEl.querySelectorAll(
        ':scope > condition-item-value-view'
      )
    ) as ConditionItemValueView[];

    if (supportsRelation(this._conditionType)) {
      const type = this._conditionType as KeysWithRelation;
      const relation: Relation = this._readRelation() ?? 'eq';

      return buildQueryFragment<KeysWithRelation>({
        type,
        relation,
        values,
        valuesContainer: this._valuesContainerEl,
      });
    } else {
      const type = this._conditionType as NoRelationType;
      return buildQueryFragment<NoRelationType>({
        type,
        values,
        valuesContainer: this._valuesContainerEl,
      });
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DOM construction
  // ───────────────────────────────────────────────────────────────────────────

  private _initializeHTML(): void {
    this.rootEl.classList.add('advanced-search-condition-item-view');
    this.rootEl.dataset.classification = this._conditionType;

    if (this._relationSupported) {
      this.rootEl.dataset.relation = 'eq';
    } else {
      delete this.rootEl.dataset.relation;
    }

    const { body, backdrop } = this._generateDOM();
    this.rootEl.replaceChildren(body, backdrop);
    this._setRelation(this._readRelation());
  }

  /**
   * createEl でDOM構造を一括生成し、頻繁にアクセスするノードを直接参照としてキャッシュする。
   * querySelector で毎回探索するよりもパフォーマンスとコードの可読性が向上する。
   */
  private _generateDOM(): { body: HTMLDivElement; backdrop: HTMLDivElement } {
    const cond = ADVANCED_CONDITIONS[
      this._conditionType
    ] as ConditionDefinition;

    const relationChild = this._relationSupported
      ? (this._relationEl = createEl('div', {
          class: 'relation-toggle',
          attrs: {
            role: 'button',
            'aria-label': 'Toggle relation',
            tabindex: '0',
          },
        }))
      : null;

    this._conditionHeaderEl = createEl('div', {
      class: 'condition-header',
      children: [
        // TODO: In the future, implement drag-and-drop ordering.
        (this._conditionLabelEl = createEl('div', {
          class: 'condition-label',
          text: cond.label,
        })),
        ...(relationChild ? [relationChild] : []),
        (this._valuesContainerEl = createEl('div', {
          class: 'values-container',
        })),
        createEl('div', {
          class: 'item-actions',
          children: [
            (this._btnEdit = createEl('button', {
              class: 'edit',
              attrs: { type: 'button', title: 'Edit', 'aria-label': 'Edit' },
            })),
            (this._btnDelete = createEl('button', {
              class: 'delete',
              attrs: {
                type: 'button',
                title: 'Delete',
                'aria-label': 'Delete',
              },
            })),
          ],
        }),
      ],
    });

    const body = createEl('div', {
      class: 'condition-card',
      children: [
        this._conditionHeaderEl,
        (this._editorEl = createEl('div', {
          class: 'advanced-search-condition-editor-view',
        })),
      ],
    });

    const backdrop = createEl('div', { class: 'backdrop' });
    return { body, backdrop };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Event wiring
  // ───────────────────────────────────────────────────────────────────────────

  private _attachEventDelegation(): void {
    const { signal } = this._events;

    // この条件行内のクリックがグループの選択トグルへ伝播しないよう止める。
    this.rootEl.addEventListener('click', (e) => e.stopPropagation(), {
      signal,
    });

    this._btnDelete.addEventListener(
      'click',
      (e) => {
        e.stopPropagation();
        this._builder.deleteCondition([this]);
      },
      { signal }
    );

    this._btnEdit.addEventListener(
      'click',
      (e) => {
        e.stopPropagation();
        this._enterEditMode();
      },
      { signal }
    );

    if (this._relationSupported && this._relationEl) {
      this._relationEl.addEventListener(
        'click',
        (e) => {
          e.stopPropagation();
          this._toggleRelation();
        },
        { signal }
      );

      this._relationEl.addEventListener(
        'keydown',
        (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            this._toggleRelation();
          }
        },
        { signal }
      );
    }

    // condition-header 背景クリックで選択トグル。ボタンやrelation要素は上記で処理済みなので除外。
    this._conditionHeaderEl.addEventListener(
      'click',
      (e) => {
        const t = e.target as Element;
        if (t.closest('button, .relation-toggle')) return;
        this._toggleSelection(e);
      },
      { signal }
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Relation helpers
  // ───────────────────────────────────────────────────────────────────────────

  private _toggleRelation(): void {
    if (!this._relationSupported) return;
    const cur = this._readRelation() ?? 'eq';
    const next: Relation = cur === 'eq' ? 'ne' : 'eq';
    this._setRelation(next);

    // モーダル表示中はrelation変更を検索へ反映しない（OK/Cancelで確定させる）。
    if (!storeManager.getData('showModal')) {
      this._keepLastRelation = next;
      this._builder.changeCondition();
    }
  }

  /** DOMのdata-relation属性を読み取ってRelationを返す。DOM正本にすることでhydrate後のズレを防ぐ。 */
  private _readRelation(): Relation | undefined {
    if (!this._relationSupported) return undefined;
    const r = this.rootEl.dataset.relation;
    return r === 'eq' || r === 'ne' ? r : undefined;
  }

  /** data-relation属性とaria-pressed属性を同時に更新して、DOMとARIAの整合性を保つ。 */
  private _setRelation(next: Relation | undefined): void {
    if (!this._relationSupported) {
      delete this.rootEl.dataset.relation;
      return;
    }
    if (!next) next = 'eq';
    this.rootEl.dataset.relation = next;
    if (this._relationEl) {
      // aria-pressed: 'ne'（否定）を "押されている" 状態として扱う。
      this._relationEl.setAttribute('aria-pressed', String(next === 'ne'));
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Edit mode / modal lifecycle
  // ───────────────────────────────────────────────────────────────────────────

  private _enterEditMode(): void {
    this.rootEl.classList.add('-editing');
    this._conditionValues.startToEditCondition();
    storeManager.setData('showModal', true);
    this._toggleGlobalKeydown(true);
  }

  /**
   * グローバルのEscapeハンドラをAbortControllerで着脱する。
   * イベントリスナーをこのインスタンスのsignalに紐付けることで、
   * remove()時に確実に解除される。
   */
  private _toggleGlobalKeydown(enable: boolean): void {
    const fn = this._keydownEscapeEvent;
    if (enable) {
      window.addEventListener('keydown', fn, { signal: this._events.signal });
    } else {
      window.removeEventListener('keydown', fn);
    }
  }

  /**
   * Escapeキーのハンドラ。
   * 初回編集中のEscapeは条件行ごと削除し、2回目以降は変更を破棄して閉じる。
   */
  private readonly _keydownEscapeEvent = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !storeManager.getData('showModal')) return;
    if (keyDownEvent('showModal')) {
      if (this._isFirstTime) {
        this.remove();
      } else {
        this.revertChanges();
        this.doneEditing();
      }
    }
  };

  /** 編集をキャンセルするときにエディタの値とrelationを直前の確定値へ戻す。 */
  revertChanges(): void {
    for (const editor of this._conditionValues.editors) editor.restore();
    this._setRelation(
      this._relationSupported ? this._keepLastRelation : undefined
    );
  }
}
