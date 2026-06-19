import { BaseConditionView } from './ConditionView';
import ConditionValues from './ConditionValues';
import { storeManager } from '../../store/StoreManager';
import {
  supportsRelation,
  type NoRelationType,
  type KeysWithRelation,
} from '../../conditions';
import { ADVANCED_CONDITIONS } from '../../global';

import {
  CONDITION_NODE_KIND,
  CONDITION_TYPE,
  type ConditionTypeValue,
} from '../../definition';
import { keyDownEvent } from '../../utils/keyDownEvent';
import { buildQueryFragment } from './queryBuilders';
import { createEl } from '../../utils/dom/createEl';
import type { AdvancedSearchBuilderView } from '../AdvancedSearch/AdvancedSearchBuilderView';
import type { ConditionGroupView } from './ConditionGroupView';
import type {
  ConditionQuery,
  Relation,
  ConditionDefinition,
  SignificanceSource,
  RestoredConditionValue,
} from '../../types';
import type { ConditionItemValueView } from './ConditionItemValueView';
import type { FrequencyCountValueView } from './FrequencyCountValueView';
import type { PredictionValueView } from './ConditionPathogenicityPredictionSearch/PredictionValueView';

/**
 * 1条件行の View。編集・削除・relation切り替えのイベントと、
 * URLからの値復元（hydrate）を担う。
 */
export class ConditionItemView extends BaseConditionView {
  readonly conditionNodeKind = CONDITION_NODE_KIND.condition;

  private readonly _conditionType: ConditionTypeValue;
  private readonly _relationSupported: boolean;

  private _isFirstTime = true;
  // Escapeでキャンセルするときに戻すための直前のrelation値。
  private _keepLastRelation: Relation = 'eq';

  private _summaryEl!: HTMLDivElement;
  private _relationEl!: HTMLDivElement;
  private _valuesContainerEl!: HTMLDivElement;
  private _btnEdit!: HTMLButtonElement;
  private _btnDelete!: HTMLButtonElement;
  private _editorEl!: HTMLDivElement;
  private _classificationEl!: HTMLDivElement;

  private _conditionValues!: ConditionValues;

  /** このインスタンスが登録したリスナーをまとめて解除するController。 */
  private readonly _events = new AbortController();

  constructor(
    builder: AdvancedSearchBuilderView,
    parentGroup: ConditionGroupView,
    conditionType: ConditionTypeValue,
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
    super.remove();
  }

  updateClassificationText(newText: string): void {
    if (this._classificationEl) {
      this._classificationEl.textContent = newText;
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
    this._valuesContainerEl.replaceChildren();

    for (const value of options.values) {
      const valueView = this._createRestoredValueView(value);
      this._appendRestoredValueView(valueView, value);
      await this._hydrateNestedValueView(valueView, value);
      await this._hydratePredictionValueView(valueView, value);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Accessors
  // ───────────────────────────────────────────────────────────────────────────

  /** この条件行が対象とする条件種別。生成後は変わらないためreadonlyで保持する。 */
  get conditionType(): ConditionTypeValue {
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
  // Restore helpers（hydration）
  // ───────────────────────────────────────────────────────────────────────────

  private _createRestoredValueView(
    value: RestoredConditionValue
  ): ConditionItemValueView {
    const valueView = document.createElement(
      'condition-item-value-view'
    ) as ConditionItemValueView;
    valueView.conditionType = this._conditionType;
    valueView.value = value.value;
    valueView.label = value.label;
    valueView.deleteButton = this._conditionType === CONDITION_TYPE.variant_id;
    return valueView;
  }

  private _appendRestoredValueView(
    valueView: ConditionItemValueView,
    value: RestoredConditionValue
  ): void {
    if (this._conditionType === CONDITION_TYPE.significance && value.source) {
      this._getSignificanceValueContainer(value.source).append(valueView);
      return;
    }

    this._valuesContainerEl.append(valueView);
  }

  /**
   * significanceはsource（mgend/clinvar）ごとにラベル付きラッパーを持つ。
   * ラッパーがなければ生成して追加し、あればそれを返す。
   * source別に条件値をグループ化するためのDOM構造をここで遅延生成する。
   */
  private _getSignificanceValueContainer(
    source: SignificanceSource
  ): HTMLElement {
    const wrapperClass = `${source}-wrapper`;
    const conditionWrapperClass = `${source}-condition-wrapper`;

    const existing = this._valuesContainerEl.querySelector<HTMLElement>(
      `.${wrapperClass} > .${conditionWrapperClass}`
    );
    if (existing) return existing;

    const outer = document.createElement('div');
    outer.classList.add(wrapperClass);

    const label = document.createElement('span');
    label.classList.add(source);
    label.textContent = source === 'mgend' ? 'MGeND' : 'Clinvar';

    const container = document.createElement('div');
    container.classList.add(conditionWrapperClass);

    outer.append(label, container);
    this._valuesContainerEl.append(outer);
    return container;
  }

  /**
   * frequency値をLit要素へ注入する。
   * condition-item-value-view はLitコンポーネントのため、
   * updateComplete を待たないとshadowRootが未構築で要素が見つからない。
   */
  private async _hydrateNestedValueView(
    valueView: ConditionItemValueView,
    value: RestoredConditionValue
  ): Promise<void> {
    if (!value.frequency) return;

    await valueView.updateComplete;
    const frequencyValueView =
      valueView.shadowRoot?.querySelector<FrequencyCountValueView>(
        'frequency-count-value-view'
      );
    if (!frequencyValueView) return;

    const frequency = value.frequency;
    frequencyValueView.setValues(
      frequency.conditionType,
      frequency.mode,
      frequency.from,
      frequency.to,
      frequency.invert,
      frequency.filtered
    );
  }

  /**
   * prediction値をLit要素へ注入する。
   * prediction-value-view 自体もLitコンポーネントのため、
   * 2段階のupdateComplete待機が必要になる。
   *
   * await の間にエディタ内スライダーの初回レンダリングイベント（set-prediction-values）が
   * 発火し、valueView の label/value を 'AlphaMissense' に上書きすることがある。
   * setValues 後に再設定することで正しいラベルを保証する。
   */
  private async _hydratePredictionValueView(
    valueView: ConditionItemValueView,
    value: RestoredConditionValue
  ): Promise<void> {
    if (!value.prediction) return;

    await valueView.updateComplete;
    const predictionValueView =
      valueView.shadowRoot?.querySelector<PredictionValueView>(
        'prediction-value-view'
      );
    if (!predictionValueView) return;

    await predictionValueView.updateComplete;

    const prediction = value.prediction;
    predictionValueView.setValues(
      prediction.dataset,
      prediction.values,
      prediction.inequalitySigns,
      prediction.includeUnassigned,
      prediction.includeUnknown
    );

    // スライダーの初回レンダリングイベントが上書きした場合に備えて再設定する。
    valueView.value = value.value;
    valueView.label = value.label;
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

    this._summaryEl = createEl('div', {
      class: 'condition-header',
      children: [
        // TODO: In the future, implement drag-and-drop ordering.
        (this._classificationEl = createEl('div', {
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
        this._summaryEl,
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

    // summary 背景クリックで選択トグル。ボタンやrelation要素は上記で処理済みなので除外。
    this._summaryEl.addEventListener(
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
        this._revertChanges();
        this.doneEditing();
      }
    }
  };

  /** 編集をキャンセルするときにエディタの値とrelationを直前の確定値へ戻す。 */
  private _revertChanges(): void {
    for (const editor of this._conditionValues.editors) editor.restore();
    this._setRelation(
      this._relationSupported ? this._keepLastRelation : undefined
    );
  }
}
