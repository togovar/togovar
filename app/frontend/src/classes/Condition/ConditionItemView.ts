import { ConditionView } from './ConditionView.js';
import ConditionValues from './ConditionValues';
import { storeManager } from '../../store/StoreManager';
import { ADVANCED_CONDITIONS } from '../../global';
import {
  CONDITION_TYPE,
  CONDITION_ITEM_TYPE,
  ConditionTypeValue,
} from '../../definition';
import { keyDownEvent } from '../../utils/keyDownEvent.js';

import {
  AdvancedSearchBuilderView,
  ConditionGroupView,
  LocationQuery,
  GeneQuery,
  IdQuery,
  SignificanceQuery,
  DefaultQuery,
  ConditionItemValueViewElement,
  FrequencyCountValueViewElement,
  PredictionValueViewElement,
  ConditionQuery,
} from '../../types/conditionTypes';

/**
 * Represents a condition item view for editing and deleting search conditions.
 * This class extends ConditionView and provides functionality for managing
 * individual search conditions in the advanced search interface.
 */
class ConditionItemView extends ConditionView {
  private readonly _conditionType: ConditionTypeValue; // The type of condition (e.g., gene, id, dataset, location)
  private _isFirstTime: boolean; // Whether this is the first time editing (affects deletion behavior)
  private _keepLastRelation: string; // Stores the last relation state for cancellation purposes

  private _valuesEl: HTMLDivElement | undefined; // DOM element containing the condition values
  private _editorEl: HTMLDivElement | undefined; // DOM element containing the condition editor

  /** The condition values manager instance */
  private _conditionValues: ConditionValues | undefined;

  /**
   * Creates a new ConditionItemView instance
   *
   * @param builder - The advanced search builder that manages search conditions
   * @param parentView - The parent condition group view that contains this item
   * @param conditionType - The type of condition (dataset, significance, consequence, disease, gene, id, location, type)
   * @param options - Additional options for the condition item
   * @param conditionItemType - Item type identifier (0 for ConditionItemView, 1 for ConditionGroupView)
   * @param referenceElm - Optional reference element for positioning
   */
  constructor(
    builder: AdvancedSearchBuilderView,
    parentView: ConditionGroupView,
    conditionType: string,
    conditionItemType: 0 | 1,
    referenceElm: Node | null = null
  ) {
    super(
      CONDITION_ITEM_TYPE.condition,
      builder,
      parentView,
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

  /**
   * Exits edit mode and triggers condition search
   */
  doneEditing(): void {
    this._conditionViewEl.classList.remove('-editing');
    this._isFirstTime = false;
    this._builder.changeCondition();
    storeManager.setData('showModal', false);
    window.removeEventListener('keydown', this._keydownEscapeEvent);
  }

  /**
   * Removes the condition item from the DOM and cleans up resources
   * Used in _clickCancelButton of ConditionValues
   */
  remove(): void {
    this._conditionValues = undefined;
    super.remove();
    storeManager.setData('showModal', false);
    window.removeEventListener('keydown', this._keydownEscapeEvent);
  }

  /**
   * Gets the condition type (gene, id, dataset, location, etc.)
   */
  get conditionType(): string {
    return this._conditionType;
  }

  /**
   * Gets the DOM element containing condition values
   */
  get valuesElement(): HTMLDivElement {
    return this._valuesEl!;
  }

  /**
   * Gets the DOM element containing the condition editor
   */
  get editorElement(): HTMLDivElement {
    return this._editorEl!;
  }

  /**
   * Gets whether this is the first time editing
   */
  get isFirstTime(): boolean {
    return this._isFirstTime;
  }

  /**
   * Gets the last saved relation state
   */
  get keepLastRelation(): string {
    return this._keepLastRelation;
  }

  /**
   * Creates and returns the search query object based on the current condition values
   * @see {@link https://grch38.togovar.org/api} API Schemas documentation
   */
  get query(): ConditionQuery {
    const valueElements = this._getValueElements();

    switch (this._conditionType) {
      case CONDITION_TYPE.dataset:
      case CONDITION_TYPE.genotype:
        return this._buildDatasetQuery(valueElements);

      case CONDITION_TYPE.pathogenicity_prediction:
        return this._buildPathogenicityQuery(valueElements);

      case CONDITION_TYPE.location:
        return this._buildLocationQuery(valueElements);

      case CONDITION_TYPE.gene_symbol:
        return this._buildGeneQuery(valueElements);

      case CONDITION_TYPE.variant_id:
        return this._buildVariantIdQuery(valueElements);

      case CONDITION_TYPE.significance:
        return this._buildSignificanceQuery();

      default:
        return this._buildDefaultQuery(valueElements);
    }
  }

  /**
   * Initializes the HTML structure for the condition item
   */
  private _initializeHTML(): void {
    this._conditionViewEl.classList.add('advanced-search-condition-item-view');
    this._conditionViewEl.dataset.classification = this._conditionType;
    this._conditionViewEl.dataset.relation = this._getInitialRelation();
    this._conditionViewEl.innerHTML = this._generateHTML();
  }

  /**
   * Determines the initial relation value based on condition type
   */
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

  /**
   * Generates the HTML template for the condition item
   */
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

  /**
   * Sets up DOM element references
   */
  private _setupDOMReferences(): void {
    const body = this._conditionViewEl.querySelector(':scope > .body')!;
    const summary = body.querySelector(':scope > .summary')!;

    this._valuesEl = summary.querySelector(
      ':scope > .values'
    ) as HTMLDivElement;
    this._editorEl = body.querySelector(
      ':scope > .advanced-search-condition-editor-view'
    ) as HTMLDivElement;

    this._conditionValues = new ConditionValues(this); // conditionItemType is always 0 for ConditionItemView
  }

  /**
   * Attaches event listeners to DOM elements
   */
  private _attachEventListeners(): void {
    this._attachClickPropagationStopper();
    this._attachSelectionToggle();
    this._attachRelationToggle();
    this._attachButtonHandlers();
    this._attachKeyboardHandler();
  }

  /**
   * Prevents click event propagation
   */
  private _attachClickPropagationStopper(): void {
    this._conditionViewEl.addEventListener('click', (e: MouseEvent) => {
      e.stopImmediatePropagation();
    });
  }

  /**
   * Attaches selection toggle functionality
   */
  private _attachSelectionToggle(): void {
    const summary = this._conditionViewEl.querySelector(
      ':scope > .body > .summary'
    )!;
    summary.addEventListener('click', this._toggleSelecting.bind(this));
  }

  /**
   * Attaches logical operation toggle functionality
   */
  private _attachRelationToggle(): void {
    const summary = this._conditionViewEl.querySelector(
      ':scope > .body > .summary'
    )!;
    const relationElement = summary.querySelector(':scope > .relation')!;

    relationElement.addEventListener('click', (e: Event) => {
      const mouseEvent = e as MouseEvent;
      mouseEvent.stopImmediatePropagation();
      this._toggleRelation();
    });
  }

  /**
   * Toggles the logical relation between 'eq' and 'ne'
   */
  private _toggleRelation(): void {
    const currentRelation = this._conditionViewEl.dataset.relation;
    this._conditionViewEl.dataset.relation =
      currentRelation === 'eq' ? 'ne' : 'eq';

    if (!storeManager.getData('showModal')) {
      this._keepLastRelation = this._conditionViewEl.dataset.relation!;
      this._builder.changeCondition();
    }
  }

  /**
   * Attaches edit and delete button handlers
   */
  private _attachButtonHandlers(): void {
    const summary = this._conditionViewEl.querySelector(
      ':scope > .body > .summary'
    )!;
    const buttons = summary.querySelectorAll(':scope > .buttons > button');

    for (const button of buttons) {
      button.addEventListener('click', (e: Event) => {
        const mouseEvent = e as MouseEvent;
        mouseEvent.stopImmediatePropagation();
        this._handleButtonClick(mouseEvent.target as HTMLButtonElement);
      });
    }
  }

  /**
   * Handles button click events
   */
  private _handleButtonClick(target: HTMLButtonElement): void {
    switch (target.className) {
      case 'edit':
        this._enterEditMode();
        break;
      case 'delete':
        this._builder.delete([this]);
        break;
    }
  }

  /**
   * Enters edit mode for the condition
   */
  private _enterEditMode(): void {
    this._conditionViewEl.classList.add('-editing');
    this._conditionValues!.startToEditCondition();
    storeManager.setData('showModal', true);
    window.addEventListener('keydown', this._keydownEscapeEvent);
  }

  /**
   * Attaches keyboard event handler
   */
  private _attachKeyboardHandler(): void {
    window.addEventListener('keydown', this._keydownEscapeEvent);
  }

  /**
   * Automatically enters edit mode when the instance is created
   */
  private _autoEnterEditMode(): void {
    const summary = this._conditionViewEl.querySelector(
      ':scope > .body > .summary'
    )!;
    const editButton = summary.querySelector(
      ':scope > .buttons > button.edit'
    ) as HTMLButtonElement;
    editButton.dispatchEvent(new Event('click'));
  }

  /**
   * Bound reference to the keyboard escape handler
   */
  private readonly _keydownEscapeEvent = this._keydownEscape.bind(this);

  /**
   * Handles escape key press to exit edit mode
   * Removes the item if it's first time editing, otherwise reverts changes
   */
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

  /**
   * Reverts all changes made during editing
   */
  private _revertChanges(): void {
    for (const editor of this._conditionValues!.editors) {
      editor.restore();
      this._conditionViewEl.dataset.relation = this._keepLastRelation;
    }
  }

  /**
   * Gets all condition item value view elements
   */
  private _getValueElements(): ConditionItemValueViewElement[] {
    return Array.from(
      this._valuesEl!.querySelectorAll(':scope > condition-item-value-view')
    ) as ConditionItemValueViewElement[];
  }

  /**
   * Builds query for dataset and genotype conditions
   */
  private _buildDatasetQuery(
    valueElements: ConditionItemValueViewElement[]
  ): ConditionQuery {
    const queries = valueElements.map((view) => {
      const shadowRoot = (view as any).shadowRoot;
      const frequencyCountElement = shadowRoot.querySelector(
        'frequency-count-value-view'
      ) as FrequencyCountValueViewElement;
      return frequencyCountElement.queryValue;
    });

    return queries.length <= 1 ? queries[0] : { or: queries };
  }

  /**
   * Builds query for pathogenicity prediction conditions
   */
  private _buildPathogenicityQuery(
    valueElements: ConditionItemValueViewElement[]
  ): ConditionQuery {
    const shadowRoot = (valueElements[0] as any).shadowRoot;
    const predictionElement = shadowRoot.querySelector(
      'prediction-value-view'
    ) as PredictionValueViewElement;

    return predictionElement.queryValue;
  }

  /**
   * Builds query for location-based conditions
   */
  private _buildLocationQuery(
    valueElements: ConditionItemValueViewElement[]
  ): LocationQuery {
    const value = valueElements[0].value;
    const [chromosome, positionStr] = value.split(':');
    const positionArray = positionStr.split('-');

    let position: number | { gte: number; lte: number };
    if (positionArray.length === 1) {
      position = +positionArray[0];
    } else {
      position = {
        gte: +positionArray[0],
        lte: +positionArray[1],
      };
    }

    return { location: { chromosome, position } };
  }

  /**
   * Builds query for gene symbol conditions
   */
  private _buildGeneQuery(
    valueElements: ConditionItemValueViewElement[]
  ): GeneQuery {
    const queryId = valueElements[0]?.value;
    return {
      gene: {
        relation: this._conditionViewEl.dataset.relation!,
        terms: [Number(queryId)],
      },
    };
  }

  /**
   * Builds query for variant ID conditions
   */
  private _buildVariantIdQuery(
    valueElements: ConditionItemValueViewElement[]
  ): IdQuery {
    const ids = valueElements.map((element) => element.value);
    return { id: ids };
  }

  /**
   * Builds query for clinical significance conditions
   */
  private _buildSignificanceQuery(): ConditionQuery {
    const valueMgendElements = this._getMgendElements();
    const valueClinvarElements = this._getClinvarElements();

    const relationType =
      this._conditionViewEl.dataset.relation === 'ne' ? 'and' : 'or';
    const mgendCondition = this._buildMgendCondition(valueMgendElements);
    const clinvarCondition = this._buildClinvarCondition(valueClinvarElements);

    const conditions = [mgendCondition, clinvarCondition].filter(Boolean);

    return conditions.length === 1
      ? conditions[0]!
      : { [relationType]: conditions };
  }

  /**
   * Gets MGEND condition elements
   */
  private _getMgendElements(): ConditionItemValueViewElement[] {
    return Array.from(
      this._valuesEl!.querySelectorAll(
        ':scope > .mgend-wrapper > .mgend-condition-wrapper > condition-item-value-view'
      )
    ) as ConditionItemValueViewElement[];
  }

  /**
   * Gets ClinVar condition elements
   */
  private _getClinvarElements(): ConditionItemValueViewElement[] {
    return Array.from(
      this._valuesEl!.querySelectorAll(
        ':scope > .clinvar-wrapper > .clinvar-condition-wrapper > condition-item-value-view'
      )
    ) as ConditionItemValueViewElement[];
  }

  /**
   * Builds MGEND condition object
   */
  private _buildMgendCondition(
    elements: ConditionItemValueViewElement[]
  ): SignificanceQuery | null {
    return elements.length > 0
      ? {
          [this._conditionType]: {
            relation: this._conditionViewEl.dataset.relation!,
            source: ['mgend'],
            terms: elements.map((value) => value.value),
          },
        }
      : null;
  }

  /**
   * Builds ClinVar condition object
   */
  private _buildClinvarCondition(
    elements: ConditionItemValueViewElement[]
  ): SignificanceQuery | null {
    return elements.length > 0
      ? {
          [this._conditionType]: {
            relation: this._conditionViewEl.dataset.relation!,
            source: ['clinvar'],
            terms: elements.map((value) => value.value),
          },
        }
      : null;
  }

  /**
   * Builds default query for other condition types
   */
  private _buildDefaultQuery(
    valueElements: ConditionItemValueViewElement[]
  ): DefaultQuery {
    return {
      [this._conditionType]: {
        relation: this._conditionViewEl.dataset.relation!,
        terms: valueElements.map((value) => value.value),
      },
    };
  }
}

export default ConditionItemView;
