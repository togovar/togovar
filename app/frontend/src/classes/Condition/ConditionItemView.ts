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
import { selectRequired } from '../../utils/dom/select';

/** Condition types that do not support a logical relation (eq/ne). */
const NO_RELATION_TYPES = new Set<ConditionTypeValue>([
  'dataset',
  'genotype',
  'pathogenicity_prediction',
  'id',
  'location',
]);

/**
 * Represents a single condition item row with edit/delete behaviors.
 * Extends BaseConditionView and manages its own value editors and relation state.
 */
export class ConditionItemView extends BaseConditionView {
  readonly conditionNodeKind = CONDITION_NODE_KIND.condition;

  private readonly _conditionType: ConditionTypeValue;
  private _isFirstTime = true;
  private _keepLastRelation: Relation = 'eq';

  private _valuesEl!: HTMLDivElement;
  private _editorEl!: HTMLDivElement;
  private _conditionValues!: ConditionValues;

  /** Controller to abort all event listeners added by this instance at once. */
  private readonly _events = new AbortController();

  /** Cached getters for critical nodes (throws if not found for early detection). */
  private get _summaryEl(): HTMLDivElement {
    return selectRequired<HTMLDivElement>(
      this.rootEl,
      ':scope > .body > .summary'
    );
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

    this._initializeHTML();
    this._setupDOMReferences();
    this._attachEventDelegation();
    this._enterEditMode(); // Enter edit mode on first render.
  }

  /** Exit edit mode, close modal, and notify the builder that the condition changed. */
  doneEditing(): void {
    this.rootEl.classList.remove('-editing');
    this._isFirstTime = false;
    this._toggleGlobalKeydown(false);
    storeManager.setData('showModal', false);
    this._builder.changeCondition();
  }

  /** Clean up resources and remove the node from the DOM. */
  remove(): void {
    this._toggleGlobalKeydown(false);
    this._events.abort(); // Detach all listeners registered with this controller.
    storeManager.setData('showModal', false);
    super.remove();
  }

  get conditionType(): ConditionTypeValue {
    return this._conditionType;
  }
  get valuesElement(): HTMLDivElement {
    return this._valuesEl;
  }
  get editorElement(): HTMLDivElement {
    return this._editorEl;
  }
  get isFirstTime(): boolean {
    return this._isFirstTime;
  }
  get keepLastRelation(): Relation {
    return this._keepLastRelation;
  }

  /** Build the query fragment from current UI values and relation state. */
  get queryFragment(): ConditionQuery {
    const relation = (this.rootEl.dataset.relation ?? '') as Relation;
    const values = Array.from(
      this._valuesEl.querySelectorAll(':scope > condition-item-value-view')
    ) as ConditionItemValueViewElement[];

    return buildQueryFragment({
      type: this._conditionType,
      relation,
      values,
      valuesContainer: this._valuesEl, // significance builder expects the container
    });
  }

  /** Set up static structure and initial dataset attributes. */
  private _initializeHTML(): void {
    this.rootEl.classList.add('advanced-search-condition-item-view');
    this.rootEl.dataset.classification = this._conditionType;
    this.rootEl.dataset.relation = NO_RELATION_TYPES.has(this._conditionType)
      ? ''
      : 'eq';
    this.rootEl.innerHTML = this._generateHTML();
  }

  /** Template markup for this condition item. Prefer `createElement` if you need stronger refs. */
  private _generateHTML(): string {
    const conditionType = this
      ._conditionType as keyof typeof ADVANCED_CONDITIONS;
    const label =
      ADVANCED_CONDITIONS[conditionType]?.label ?? this._conditionType;

    return `
    <div class="body">
      <div class="summary">
        <div class="classification">${label}</div>
        <div class="relation" role="button" aria-label="Toggle relation"></div>
        <div class="values"></div>
        <div class="buttons">
          <button class="edit" type="button" title="Edit" aria-label="Edit"></button>
          <button class="delete" type="button" title="Delete" aria-label="Delete"></button>
        </div>
      </div>
      <div class="advanced-search-condition-editor-view"></div>
    </div>
    <div class="bg"></div>`;
  }

  /** Cache essential DOM references and initialize the value editors. */
  private _setupDOMReferences(): void {
    const body = selectRequired<HTMLDivElement>(this.rootEl, ':scope > .body');
    const summary = selectRequired<HTMLDivElement>(body, ':scope > .summary');
    this._valuesEl = selectRequired<HTMLDivElement>(
      summary,
      ':scope > .values'
    );
    this._editorEl = selectRequired<HTMLDivElement>(
      body,
      ':scope > .advanced-search-condition-editor-view'
    );
    this._conditionValues = new ConditionValues(this);
  }

  /** Centralized click delegation within the item; stops propagation to parent containers. */
  private _attachEventDelegation(): void {
    const { signal } = this._events;

    // Prevent event leakage to outer containers.
    this.rootEl.addEventListener('click', (e) => e.stopImmediatePropagation(), {
      signal,
    });

    // Single handler for edit/delete/relation/selection inside the summary area.
    this._summaryEl.addEventListener(
      'click',
      (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button.delete')) {
          e.stopImmediatePropagation();
          this._builder.deleteCondition([this]);
          return;
        }
        if (target.closest('button.edit')) {
          e.stopImmediatePropagation();
          this._enterEditMode();
          return;
        }
        if (target.closest('.relation')) {
          e.stopImmediatePropagation();
          this._toggleRelation();
          return;
        }
        // Fallback: toggle selection on summary click.
        this._toggleSelection(e);
      },
      { signal }
    );
  }

  /** Toggle relation state between 'eq' and 'ne', then notify if modal is not open. */
  private _toggleRelation(): void {
    const next: Relation = this.rootEl.dataset.relation === 'eq' ? 'ne' : 'eq';
    this.rootEl.dataset.relation = next;
    if (!storeManager.getData('showModal')) {
      this._keepLastRelation = next;
      this._builder.changeCondition();
    }
  }

  /** Enter edit mode, initialize editors, show modal state, and bind keyboard handler. */
  private _enterEditMode(): void {
    this.rootEl.classList.add('-editing');
    this._conditionValues.startToEditCondition();
    storeManager.setData('showModal', true);
    this._toggleGlobalKeydown(true);
  }

  /** Attach or detach the global Escape key handler for edit mode. */
  private _toggleGlobalKeydown(enable: boolean): void {
    const fn = this._keydownEscapeEvent;
    if (enable) {
      window.addEventListener('keydown', fn, { signal: this._events.signal });
    } else {
      window.removeEventListener('keydown', fn);
    }
  }

  /** Exit edit mode on Escape: delete if first time, otherwise restore and close. */
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

  /** Restore editor states and last relation when canceling edits. */
  private _revertChanges(): void {
    for (const editor of this._conditionValues.editors) editor.restore();
    this.rootEl.dataset.relation = this._keepLastRelation;
  }
}
