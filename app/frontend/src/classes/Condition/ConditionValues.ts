import { CONDITION_TYPE } from '../../definition';
import ConditionValueEditorCheckboxes from './ConditionValueEditor/ConditionValueEditorCheckboxes.js';
import ConditionValueEditorClinicalSignificance from './ConditionValueEditor/ConditionValueEditorClinicalSignificance';
import ConditionValueEditorColumns from './ConditionValueEditor/ConditionValueEditorColumns.js';
import ConditionValueEditorColumnsDataset from './ConditionValueEditor/ConditionValueEditorColumnsDataset';
import ConditionValueEditorDisease from './ConditionValueEditor/ConditionValueEditorDisease.js';
import ConditionValueEditorFrequencyCount from './ConditionValueEditor/ConditionValueEditorFrequencyCount';
import ConditionValueEditorGene from './ConditionValueEditor/ConditionValueEditorGene.js';
import ConditionValueEditorLocation from './ConditionValueEditor/ConditionValueEditorLocation.js';
import ConditionValueEditorPathogenicityPrediction from './ConditionValueEditor/ConditionValueEditorPathogenicityPrediction';
import ConditionValueEditorVariantID from './ConditionValueEditor/ConditionValueEditorVariantID.js';
import type { ConditionItemView } from './ConditionItemView';

interface ConditionValueEditor {
  keepLastValues(): void;
  restore(): void;
  isValid: boolean;
}

/**
 * About the AdvancedSearch edit screen.
 * Create an instance of ConditionValueEditors
 */
class ConditionValues {
  private _conditionView: ConditionItemView;
  private _editors: ConditionValueEditor[];
  private _sections: HTMLDivElement;
  private _okButton: HTMLButtonElement;

  constructor(conditionView: ConditionItemView) {
    this._conditionView = conditionView;
    this._editors = [];

    // HTML
    conditionView.editorElement.innerHTML = `
      <div class="sections"></div>
      <div class="buttons">
        <button class="button-view -disabled">OK</button>
        <button class="button-view -negative">Cancel</button>
      </div>`;

    // references
    this._sections = conditionView.editorElement.querySelector(
      ':scope > .sections'
    ) as HTMLDivElement;
    const buttons = conditionView.editorElement.querySelector(
      ':scope > .buttons'
    ) as HTMLElement;
    this._okButton = buttons.querySelector(
      ':scope > .button-view:nth-child(1)'
    ) as HTMLButtonElement;

    // events
    this._okButton.addEventListener('click', this._clickOkButton.bind(this));
    buttons
      .querySelector(':scope > .button-view:nth-child(2)')!
      .addEventListener('click', this._clickCancelButton.bind(this));

    // initialization by types
    switch (conditionView.conditionType) {
      case CONDITION_TYPE.type:
        this._editors.push(
          new ConditionValueEditorCheckboxes(
            this as any,
            this._conditionView as any
          )
        );
        break;

      case CONDITION_TYPE.significance:
        this._editors.push(
          new ConditionValueEditorClinicalSignificance(
            this as any,
            this._conditionView as any
          )
        );
        break;

      case CONDITION_TYPE.consequence:
        this._editors.push(
          new ConditionValueEditorColumns(
            this as any,
            this._conditionView as any
          )
        );
        break;

      case CONDITION_TYPE.dataset:
      case CONDITION_TYPE.genotype:
        this._editors.push(
          new ConditionValueEditorColumnsDataset(
            this as any,
            this._conditionView as any
          )
        );
        this._editors.push(
          new ConditionValueEditorFrequencyCount(
            this as any,
            this._conditionView as any
          )
        );
        break;

      case CONDITION_TYPE.disease:
        this._editors.push(
          new ConditionValueEditorDisease(
            this as any,
            this._conditionView as any
          )
        );
        break;

      case CONDITION_TYPE.gene_symbol:
        this._editors.push(
          new ConditionValueEditorGene(this as any, this._conditionView as any)
        );
        break;

      case CONDITION_TYPE.pathogenicity_prediction:
        this._editors.push(
          new ConditionValueEditorPathogenicityPrediction(
            this as any,
            this._conditionView as any
          )
        );
        break;

      case CONDITION_TYPE.variant_id:
        this._editors.push(
          new ConditionValueEditorVariantID(
            this as any,
            this._conditionView as any
          )
        );
        break;

      case CONDITION_TYPE.location:
        this._editors.push(
          new ConditionValueEditorLocation(
            this as any,
            this._conditionView as any,
            0
          )
        );
        break;
    }
  }

  // public methods
  /** Retains the value of ConditionValueEditor once editing starts */
  startToEditCondition(): void {
    for (const editor of this._editors) {
      editor.keepLastValues();
    }
  }

  /** Whether isValid(whether condition has a value) is true or false and okButton is disabled */
  update(isValid: boolean): void {
    if (
      [CONDITION_TYPE.dataset, CONDITION_TYPE.genotype].includes(
        this._conditionView.conditionType
      )
    ) {
      isValid = this._editors.every((editor) => {
        return editor.isValid;
      });
    }
    if (isValid) {
      this._okButton.classList.remove('-disabled');
    } else {
      this._okButton.classList.add('-disabled');
    }
  }

  // private methods
  /** If isFirstTime is false and there is no Node in values, delete conditionView. Otherwise finish editing */
  private _clickOkButton(e: MouseEvent): void {
    e.stopImmediatePropagation();
    this._conditionView.doneEditing();
  }

  /** When isFirstTime is true, remove conditionView. Otherwise, revert to the state before editing. */
  private _clickCancelButton(e: MouseEvent): void {
    e.stopImmediatePropagation();
    if (this._conditionView.isFirstTime) {
      this._conditionView.remove();
    } else {
      for (const editor of this._editors) {
        editor.restore();
        if (
          !['dataset', 'pathogenicity_prediction', 'id', 'location'].includes(
            this._conditionView.conditionType
          )
        ) {
          this._conditionView.rootEl.dataset.relation =
            this._conditionView.keepLastRelation;
        }
      }
      this._conditionView.doneEditing();
    }
  }

  // accessors
  get conditionView(): ConditionItemView {
    return this._conditionView;
  }

  get sections(): HTMLDivElement {
    return this._sections;
  }

  get editors(): ConditionValueEditor[] {
    return this._editors;
  }
}

export default ConditionValues;
