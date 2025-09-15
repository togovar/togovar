import { BaseConditionView } from './ConditionView';
import ConditionValues from './ConditionValues';
import { storeManager } from '../../store/StoreManager';
import { ADVANCED_CONDITIONS } from '../../global';
import { CONDITION_NODE_KIND, type ConditionTypeValue } from '../../definition';
import { keyDownEvent } from '../../utils/keyDownEvent.js';
import type AdvancedSearchBuilderView from '../AdvancedSearchBuilderView';
import type { ConditionGroupView } from './ConditionGroupView';
import type {
  ConditionItemValueViewElement,
  ConditionQuery,
  Relation,
} from '../../types';
import { buildQueryFragment } from './queryBuilders';

/**
 * Represents a condition item view for editing and deleting search conditions.
 * This class extends BaseConditionView and manages individual search conditions.
 */
export class ConditionItemView extends BaseConditionView {
  readonly conditionNodeKind = CONDITION_NODE_KIND.condition;

  private readonly _conditionType: ConditionTypeValue;
  private _isFirstTime: boolean;
  private _keepLastRelation: string;

  private _valuesEl: HTMLDivElement | undefined;
  private _editorEl: HTMLDivElement | undefined;

  /** The condition values manager instance */
  private _conditionValues: ConditionValues | undefined;

  get canCopy() {
    return true;
  }

  constructor(
    builder: AdvancedSearchBuilderView,
    parentGroup: ConditionGroupView,
    conditionType: ConditionTypeValue,
    referenceElm: Node | null = null
  ) {
    super(
      builder,
      parentGroup.container,
      referenceElm ?? document.createTextNode('')
    );

    this._conditionType = conditionType;
    this._isFirstTime = true;
    this._keepLastRelation = 'eq';

    this._initializeHTML();
    this._setupDOMReferences();
    this._attachEventListeners();
    this._autoEnterEditMode();
  }

  /** Exits edit mode and triggers condition search */
  doneEditing(): void {
    this.rootEl.classList.remove('-editing');
    this._isFirstTime = false;
    this._builder.changeCondition();
    storeManager.setData('showModal', false);
    window.removeEventListener('keydown', this._keydownEscapeEvent);
  }

  /** Removes the condition item and cleans up resources */
  remove(): void {
    this._conditionValues = undefined;
    super.remove();
    storeManager.setData('showModal', false);
    window.removeEventListener('keydown', this._keydownEscapeEvent);
  }

  get conditionType(): ConditionTypeValue {
    return this._conditionType;
  }
  get valuesElement(): HTMLDivElement {
    return this._valuesEl!;
  }
  get editorElement(): HTMLDivElement {
    return this._editorEl!;
  }
  get isFirstTime(): boolean {
    return this._isFirstTime;
  }
  get keepLastRelation(): string {
    return this._keepLastRelation;
  }

  /** Creates and returns the search query object based on current values */
  get queryFragment(): ConditionQuery {
    const values = this._getValueElements();
    const relation = (this.rootEl.dataset.relation ?? '') as Relation;

    return buildQueryFragment({
      type: this._conditionType,
      relation,
      values,
      valuesContainer: this._valuesEl!, // significance builder uses this
    });
  }

  /** Gets all condition item value view elements */
  private _getValueElements(): ConditionItemValueViewElement[] {
    return Array.from(
      this._valuesEl!.querySelectorAll(':scope > condition-item-value-view')
    ) as ConditionItemValueViewElement[];
  }

  /** Initializes the HTML structure for the condition item */
  private _initializeHTML(): void {
    this.rootEl.classList.add('advanced-search-condition-item-view');
    this.rootEl.dataset.classification = this._conditionType;
    this.rootEl.dataset.relation = this._getInitialRelation();
    this.rootEl.innerHTML = this._generateHTML();
  }

  /** Determines the initial relation value based on condition type */
  private _getInitialRelation(): string {
    const noRelationTypes = [
      'dataset',
      'genotype',
      'pathogenicity_prediction',
      'id',
      'location',
    ];
    return noRelationTypes.includes(this._conditionType) ? '' : 'eq';
  }

  /** Generates the HTML template for the condition item */
  private _generateHTML(): string {
    const conditionType = this
      ._conditionType as keyof typeof ADVANCED_CONDITIONS;
    const label = ADVANCED_CONDITIONS[conditionType]?.label;

    return `
    <div class="body">
      <div class="summary">
        <div class="classification">${label}</div>
        <div class="relation"></div>
        <div class="values"></div>
        <div class="buttons">
          <button class="edit" title="Edit"></button>
          <button class="delete" title="Delete"></button>
        </div>
      </div>
      <div class="advanced-search-condition-editor-view"></div>
    </div>
    <div class="bg"></div>`;
  }

  /** Sets up DOM element references */
  private _setupDOMReferences(): void {
    const body = this.rootEl.querySelector(':scope > .body') as HTMLDivElement;
    const summary = body.querySelector(':scope > .summary') as HTMLDivElement;

    this._valuesEl = summary.querySelector(
      ':scope > .values'
    ) as HTMLDivElement;
    this._editorEl = body.querySelector(
      ':scope > .advanced-search-condition-editor-view'
    ) as HTMLDivElement;

    this._conditionValues = new ConditionValues(this);
  }

  /** Attaches event listeners to DOM elements */
  private _attachEventListeners(): void {
    this._attachClickPropagationStopper();
    this._attachSelectionToggle();
    this._attachRelationToggle();
    this._attachButtonHandlers();
    this._attachKeyboardHandler();
  }

  /** Prevents click event propagation */
  private _attachClickPropagationStopper(): void {
    this.rootEl.addEventListener('click', (e: MouseEvent) => {
      e.stopImmediatePropagation();
    });
  }

  /** Attaches selection toggle functionality */
  private _attachSelectionToggle(): void {
    const summary = this.rootEl.querySelector(':scope > .body > .summary')!;
    summary.addEventListener('click', this._toggleSelection.bind(this));
  }

  /** Attaches logical operation toggle functionality */
  private _attachRelationToggle(): void {
    const summary = this.rootEl.querySelector(':scope > .body > .summary')!;
    const relationElement = summary.querySelector(':scope > .relation')!;

    relationElement.addEventListener('click', (e: Event) => {
      const mouseEvent = e as MouseEvent;
      mouseEvent.stopImmediatePropagation();
      this._toggleRelation();
    });
  }

  /** Toggles the logical relation between 'eq' and 'ne' */
  private _toggleRelation(): void {
    const currentRelation = this.rootEl.dataset.relation;
    this.rootEl.dataset.relation = currentRelation === 'eq' ? 'ne' : 'eq';

    if (!storeManager.getData('showModal')) {
      this._keepLastRelation = this.rootEl.dataset.relation!;
      this._builder.changeCondition();
    }
  }

  /** Attaches edit and delete button handlers */
  private _attachButtonHandlers(): void {
    const summary = this.rootEl.querySelector(':scope > .body > .summary')!;
    const buttons = summary.querySelectorAll(':scope > .buttons > button');

    for (const button of buttons) {
      button.addEventListener('click', (e: Event) => {
        const mouseEvent = e as MouseEvent;
        mouseEvent.stopImmediatePropagation();
        this._handleButtonClick(mouseEvent.target as HTMLButtonElement);
      });
    }
  }

  /** Handles button click events */
  private _handleButtonClick(target: HTMLButtonElement): void {
    switch (target.className) {
      case 'edit':
        this._enterEditMode();
        break;
      case 'delete':
        this._builder.deleteCondition([this]);
        break;
    }
  }

  /** Enters edit mode for the condition */
  private _enterEditMode(): void {
    this.rootEl.classList.add('-editing');
    this._conditionValues!.startToEditCondition();
    storeManager.setData('showModal', true);
    window.addEventListener('keydown', this._keydownEscapeEvent);
  }

  /** Attaches keyboard event handler */
  private _attachKeyboardHandler(): void {
    window.addEventListener('keydown', this._keydownEscapeEvent);
  }

  /** Automatically enters edit mode when the instance is created */
  private _autoEnterEditMode(): void {
    const summary = this.rootEl.querySelector(':scope > .body > .summary')!;
    const editButton = summary.querySelector(
      ':scope > .buttons > button.edit'
    ) as HTMLButtonElement;
    editButton.dispatchEvent(new Event('click'));
  }

  /** Bound reference to the keyboard escape handler */
  private readonly _keydownEscapeEvent = this._keydownEscape.bind(this);

  /** Handles escape key press to exit edit mode */
  private _keydownEscape(e: KeyboardEvent): void {
    if (
      e.key !== 'Escape' ||
      !this._conditionValues ||
      !storeManager.getData('showModal')
    ) {
      return;
    }

    if (keyDownEvent('showModal')) {
      if (this._isFirstTime) {
        this.remove();
      } else {
        this._revertChanges();
        this.doneEditing();
      }
    }
  }

  /** Reverts all changes made during editing */
  private _revertChanges(): void {
    for (const editor of this._conditionValues!.editors) {
      editor.restore();
      this.rootEl.dataset.relation = this._keepLastRelation;
    }
  }
}
