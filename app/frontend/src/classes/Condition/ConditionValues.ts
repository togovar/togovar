import { CONDITION_TYPE, type ConditionTypeValue } from '../../definition';
import { supportsRelation } from '../../conditions';
import { createEl } from '../../utils/dom/createEl';
import { ConditionValueEditorCheckboxes } from './ConditionValueEditor/ConditionValueEditorCheckboxes';
import { ConditionValueEditorClinicalSignificance } from './ConditionValueEditor/ConditionValueEditorClinicalSignificance';
import ConditionValueEditorColumns from './ConditionValueEditor/ConditionValueEditorColumns';
import { ConditionValueEditorDatasetColumns } from './ConditionValueEditor/ConditionValueEditorDatasetColumns';
import { ConditionValueEditorDisease } from './ConditionValueEditor/ConditionValueEditorDisease';
import { ConditionValueEditorFrequencyCount } from './ConditionValueEditor/ConditionValueEditorFrequencyCount';
import { ConditionValueEditorGene } from './ConditionValueEditor/ConditionValueEditorGene';
import { ConditionValueEditorLocation } from './ConditionValueEditor/ConditionValueEditorLocation';
import { ConditionValueEditorPathogenicityPrediction } from './ConditionValueEditor/ConditionValueEditorPathogenicityPrediction';
import { ConditionValueEditorVariantID } from './ConditionValueEditor/ConditionValueEditorVariantID';
import type { ConditionItemView } from './ConditionItemView';
import type { ConditionValueEditor, EditorCtor } from '../../types';

// 条件種別ごとに使用するエディタを宣言的に管理する。
// 新しい条件種別を追加するときはここへ追記するだけで済む。
const EDITOR_REGISTRY: Readonly<
  Partial<Record<ConditionTypeValue, EditorCtor[]>>
> = {
  [CONDITION_TYPE.type]: [ConditionValueEditorCheckboxes],
  [CONDITION_TYPE.significance]: [ConditionValueEditorClinicalSignificance],
  [CONDITION_TYPE.consequence]: [ConditionValueEditorColumns],
  [CONDITION_TYPE.dataset]: [
    ConditionValueEditorDatasetColumns,
    ConditionValueEditorFrequencyCount,
  ],
  [CONDITION_TYPE.genotype]: [
    ConditionValueEditorDatasetColumns,
    ConditionValueEditorFrequencyCount,
  ],
  [CONDITION_TYPE.disease]: [ConditionValueEditorDisease],
  [CONDITION_TYPE.gene_symbol]: [ConditionValueEditorGene],
  [CONDITION_TYPE.pathogenicity_prediction]: [
    ConditionValueEditorPathogenicityPrediction,
  ],
  [CONDITION_TYPE.variant_id]: [ConditionValueEditorVariantID],
  [CONDITION_TYPE.location]: [ConditionValueEditorLocation],
};

/**
 * 1条件行の編集パネルを管理する。
 * - OK/Cancelボタンの生成
 * - 条件種別に対応するエディタのインスタンス化
 * - 有効状態の集約とOKボタンの活性制御
 * - 確定（OK）・取消（Cancel）のイベント処理
 */
export default class ConditionValues {
  private readonly _conditionView: ConditionItemView;
  private readonly _events = new AbortController();

  private _editors: ConditionValueEditor[] = [];
  private _sectionsEl!: HTMLDivElement;
  private _okButtonEl!: HTMLButtonElement;
  private _cancelButtonEl!: HTMLButtonElement;
  private _options?: unknown;

  constructor(conditionView: ConditionItemView, options?: unknown) {
    this._conditionView = conditionView;
    this._options = options;
    this._buildDOM();
    this._wireEvents();
    this._instantiateEditorsFor(conditionView.conditionType);
  }

  // ─────────────────────────────────────────────────────────
  // Public API used by editors / owner
  // ─────────────────────────────────────────────────────────

  /** 編集モードに入るとき、エディタに「元の値を記憶」させてからOKを無効化する。 */
  startToEditCondition(): void {
    for (const ed of this._editors) ed.keepLastValues();
    this._recomputeValidity();
  }

  /**
   * エディタの有効状態が変わったときに呼ばれる。
   *
   * dataset/genotype は「データセット選択」と「頻度条件」の両方が揃わないと
   * クエリが成立しないため、全エディタが有効であることを必須とする。
   * それ以外の条件種別はエディタが1つなのでisValidHintをそのまま使う。
   */
  update(isValidHint?: boolean): void {
    const t = this._conditionView.conditionType;
    const allEditorsValid = this._editors.every((e) => e.isValid);
    const requireAll =
      t === CONDITION_TYPE.dataset || t === CONDITION_TYPE.genotype;

    const finalValid = requireAll
      ? allEditorsValid
      : isValidHint ?? allEditorsValid;
    this._setOkEnabled(finalValid);
  }

  // ─────────────────────────────────────────────────────────
  // DOM build & events
  // ─────────────────────────────────────────────────────────

  /**
   * 編集パネルのDOM構造（sections + OK/Cancelボタン）を生成する。
   * OKボタンは初期状態では disabled にしておき、エディタが有効になるまで押せないようにする。
   */
  private _buildDOM(): void {
    const sections = (this._sectionsEl = createEl('div', {
      class: 'sections',
    }));

    const buttons = createEl('div', {
      class: 'buttons',
      children: [
        (this._okButtonEl = createEl('button', {
          class: ['button-view'],
          text: 'OK',
          attrs: { type: 'button', disabled: '' },
        })),
        (this._cancelButtonEl = createEl('button', {
          class: ['button-view', '-negative'],
          text: 'Cancel',
          attrs: { type: 'button' },
        })),
      ],
    });

    this._conditionView.editorElement.replaceChildren(sections, buttons);
  }

  /**
   * OK/Cancelボタンのクリックイベントを登録する。
   * 初回追加のCancelは条件行ごと削除し、2回目以降のCancelは値を元に戻す。
   */
  private _wireEvents(): void {
    const { signal } = this._events;

    this._okButtonEl.addEventListener(
      'click',
      (e) => {
        e.stopImmediatePropagation();
        this._conditionView.doneEditing();
      },
      { signal }
    );

    this._cancelButtonEl.addEventListener(
      'click',
      (e) => {
        e.stopImmediatePropagation();
        // 初回追加のCancelは条件行を削除する（確定前のロールバック）。
        if (this._conditionView.isFirstTime) {
          this._conditionView.remove();
          return;
        }
        // 2回目以降のCancelはエディタ値とrelationを元に戻す。
        for (const ed of this._editors) ed.restore();

        if (supportsRelation(this._conditionView.conditionType)) {
          this._conditionView.rootEl.dataset.relation =
            this._conditionView.keepLastRelation;
        } else {
          delete this._conditionView.rootEl.dataset.relation;
        }

        this._conditionView.doneEditing();
      },
      { signal }
    );
  }

  /**
   * 条件種別に対応するエディタをインスタンス化する。
   * EDITOR_REGISTRY に登録のない種別はエディタなし（空配列）で動作する。
   */
  private _instantiateEditorsFor(type: ConditionTypeValue): void {
    const ctors = EDITOR_REGISTRY[type] ?? [];
    this._editors = ctors.map((Ctor) => new Ctor(this, this._conditionView));

    if (this._options) {
      for (const editor of this._editors) {
        if (typeof editor.applyOptions === 'function') {
          editor.applyOptions(this._options);
        }
      }
    }

    // 初期状態のボタン有効状態を反映する。
    this._recomputeValidity();
  }

  /** 全エディタの有効状態を再集計してOKボタンの活性を更新する。 */
  private _recomputeValidity(): void {
    this.update();
  }

  /** OKボタンの disabled 属性を切り替えてユーザーが押せる状態かを制御する。 */
  private _setOkEnabled(enabled: boolean): void {
    if (enabled) {
      this._okButtonEl.removeAttribute('disabled');
    } else {
      this._okButtonEl.setAttribute('disabled', '');
    }
  }

  // ─────────────────────────────────────────────────────────
  // Accessors
  // ─────────────────────────────────────────────────────────

  /** この編集パネルを持つ条件行View。エディタからOK/Cancel処理を委譲するために参照する。 */
  get conditionView(): ConditionItemView {
    return this._conditionView;
  }

  /** エディタのDOMを配置するsections要素。エディタはここへ自身のDOMを追加する。 */
  get sections(): HTMLDivElement {
    return this._sectionsEl;
  }

  /** この条件行に登録されているエディタの一覧。restore/keepLastValuesの一括呼び出しに使う。 */
  get editors(): readonly ConditionValueEditor[] {
    return this._editors;
  }

  /** AbortControllerでOK/Cancelのイベントリスナーをまとめてクリーンアップする。 */
  destroy(): void {
    this._events.abort();
  }
}
