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

/** Registry: which editors are used for each condition type. */
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
 * Orchestrates editors for one condition’s edit panel:
 * - builds OK/Cancel UI
 * - instantiates the correct editors
 * - aggregates validity and toggles the OK button
 * - applies or reverts on OK/Cancel
 */
export default class ConditionValues {
  private readonly _conditionView: ConditionItemView;
  private readonly _events = new AbortController();

  private _editors: ConditionValueEditor[] = [];
  private _sectionsEl!: HTMLDivElement;
  private _okButtonEl!: HTMLButtonElement;
  private _cancelButtonEl!: HTMLButtonElement;

  constructor(conditionView: ConditionItemView) {
    this._conditionView = conditionView;
    this._buildDOM();
    this._wireEvents();
    this._instantiateEditorsFor(conditionView.conditionType);
  }

  // ─────────────────────────────────────────────────────────
  // Public API used by editors / owner
  // ─────────────────────────────────────────────────────────

  /** Called by ConditionItemView right after entering edit mode. */
  startToEditCondition(): void {
    for (const ed of this._editors) ed.keepLastValues();
    this._recomputeValidity();
  }

  /** Editors call this when their internal validity changed. */
  update(isValidHint?: boolean): void {
    // For dataset/genotype we require ALL editors valid; otherwise accept hint or aggregate.
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

    // Mount once
    this._conditionView.editorElement.replaceChildren(sections, buttons);
  }

  private _wireEvents(): void {
    const { signal } = this._events;

    this._okButtonEl.addEventListener(
      'click',
      (e) => {
        e.stopImmediatePropagation();
        // Apply and close
        this._conditionView.doneEditing();
      },
      { signal }
    );

    this._cancelButtonEl.addEventListener(
      'click',
      (e) => {
        e.stopImmediatePropagation();
        if (this._conditionView.isFirstTime) {
          // First-time cancel removes the item
          this._conditionView.remove();
          return;
        }
        // Revert all editors
        for (const ed of this._editors) ed.restore();

        // Restore relation only for types that support it
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

  private _instantiateEditorsFor(type: ConditionTypeValue): void {
    const ctors = EDITOR_REGISTRY[type] ?? [];
    this._editors = ctors.map((Ctor) => new Ctor(this, this._conditionView));
    // 初期状態のボタン有効状態を反映
    this._recomputeValidity();
  }

  private _recomputeValidity(): void {
    this.update(); // aggregate from editors
  }

  private _setOkEnabled(enabled: boolean): void {
    if (enabled) {
      this._okButtonEl.removeAttribute('disabled');
    } else {
      this._okButtonEl.setAttribute('disabled', '');
    }
  }

  // ─────────────────────────────────────────────────────────
  // Accessors (used by editors)
  // ─────────────────────────────────────────────────────────

  get conditionView(): ConditionItemView {
    return this._conditionView;
  }

  get sections(): HTMLDivElement {
    return this._sectionsEl;
  }

  get editors(): readonly ConditionValueEditor[] {
    return this._editors;
  }

  /** Call to free event listeners when editor view is discarded. */
  destroy(): void {
    this._events.abort();
  }
}
