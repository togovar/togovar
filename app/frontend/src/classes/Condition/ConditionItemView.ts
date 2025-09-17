import { BaseConditionView } from './ConditionView';
import ConditionValues from './ConditionValues';
import { storeManager } from '../../store/StoreManager';
import { ADVANCED_CONDITIONS, supportsRelation } from '../../conditions';
import { CONDITION_NODE_KIND, type ConditionTypeValue } from '../../definition';
import { keyDownEvent } from '../../utils/keyDownEvent.js';
import { buildQueryFragment } from './queryBuilders';
import { createEl } from '../../utils/dom/createEl';
import type { AdvancedSearchBuilderView } from '../AdvancedSearchBuilderView';
import type { ConditionGroupView } from './ConditionGroupView';
import type {
  ConditionItemValueViewElement,
  ConditionQuery,
  Relation,
} from '../../types';

/**
 * A single condition row with edit/delete behaviors.
 * Extends BaseConditionView and owns its editor(s) and relation state.
 */
export class ConditionItemView extends BaseConditionView {
  readonly conditionNodeKind = CONDITION_NODE_KIND.condition;

  private readonly _conditionType: ConditionTypeValue;
  /** Whether this condition type supports a logical relation (eq/ne). */
  private readonly _relationSupported: boolean;
  /** True until the first edit is completed; used for Esc handling. */
  private _isFirstTime = true;
  /** Last confirmed relation that we restore on cancel. */
  private _keepLastRelation: Relation = 'eq';

  /** Cached DOM refs created in _generateDOM. */
  private _summaryEl!: HTMLDivElement;
  private _relationEl!: HTMLDivElement;
  private _valuesEl!: HTMLDivElement;
  private _btnEdit!: HTMLButtonElement;
  private _btnDelete!: HTMLButtonElement;
  private _editorEl!: HTMLDivElement;

  /** Entry point for value editors of this item. */
  private _conditionValues!: ConditionValues;

  /** One AbortController to remove all event listeners this instance added. */
  private readonly _events = new AbortController();

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
    this._relationSupported = supportsRelation(conditionType);

    this._initializeHTML();
    this._conditionValues = new ConditionValues(this);
    this._attachEventDelegation();
    this._enterEditMode(); // Start in edit mode on first render.
  }

  /** Leave edit mode, close modal, and notify the builder that this item changed. */
  doneEditing(): void {
    this.rootEl.classList.remove('-editing');
    this._isFirstTime = false;
    this._toggleGlobalKeydown(false);
    storeManager.setData('showModal', false);
    this._builder.changeCondition();
  }

  /** Clean up resources and remove this item from the DOM. */
  remove(): void {
    this._toggleGlobalKeydown(false);
    this._events.abort(); // Detach all listeners registered with this controller.
    storeManager.setData('showModal', false);
    // this._conditionValues?.destroy?.(); // Uncomment if ConditionValues implements destroy().
    super.remove();
  }

  // ---------- accessors ----------

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

  /**
   * Build a query fragment from the current UI and relation state.
   * Note: relation may be '' (empty) when the type does not support relation.
   */
  get queryFragment(): ConditionQuery {
    const relation = (this.rootEl.dataset.relation ?? '') as Relation;
    const values = Array.from(
      this._valuesEl.querySelectorAll(':scope > condition-item-value-view')
    ) as ConditionItemValueViewElement[];

    return buildQueryFragment({
      type: this._conditionType,
      relation,
      values,
      valuesContainer: this._valuesEl, // needed by significance builder
    });
  }

  /**
   * Set up static structure and initial dataset attributes on the root element.
   * - classification: the condition type
   * - relation: 'eq' or 'ne' if supported, otherwise '' (empty)
   * - children: built by _generateDOM()
   */
  private _initializeHTML(): void {
    this.rootEl.classList.add('advanced-search-condition-item-view');
    this.rootEl.dataset.classification = this._conditionType;
    this.rootEl.dataset.relation = this._relationSupported ? 'eq' : '';

    const { body, bg } = this._generateDOM();
    this.rootEl.replaceChildren(body, bg);

    this._syncRelationUI();
  }

  /**
   * Sync the relation control UI (ARIA/state) with the current capabilities and state.
   * - When unsupported: disable control and hide pressed state
   * - When supported: enable control and reflect the current pressed state
   */
  private _syncRelationUI(): void {
    if (this._relationSupported) {
      this._relationEl.removeAttribute('aria-disabled');
      this._relationEl.classList.remove('-disabled');
      this._relationEl.setAttribute('tabindex', '0');
      const pressed = this.rootEl.dataset.relation === 'ne';
      this._relationEl.setAttribute('aria-pressed', String(pressed));
    } else {
      this._relationEl.setAttribute('aria-disabled', 'true');
      this._relationEl.classList.add('-disabled');
      this._relationEl.setAttribute('tabindex', '-1');
      this._relationEl.removeAttribute('aria-pressed');
    }
  }

  /**
   * Create the inner DOM using `createEl` and cache important nodes.
   * We keep direct references (buttons, relation, values…) to avoid repeated queries.
   */
  private _generateDOM(): { body: HTMLDivElement; bg: HTMLDivElement } {
    const meta = ADVANCED_CONDITIONS[this._conditionType];
    const label = meta?.label ?? this._conditionType;

    this._summaryEl = createEl('div', {
      class: 'summary',
      children: [
        createEl('div', { class: 'classification', text: label }),
        (this._relationEl = createEl('div', {
          class: 'relation',
          attrs: {
            role: 'button',
            'aria-label': 'Toggle relation',
            'aria-pressed': 'false',
          },
        })),
        (this._valuesEl = createEl('div', { class: 'values' })),
        createEl('div', {
          class: 'buttons',
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
      class: 'body',
      children: [
        this._summaryEl,
        (this._editorEl = createEl('div', {
          class: 'advanced-search-condition-editor-view',
        })),
      ],
    });
    const bg = createEl('div', { class: 'bg' });

    return { body, bg };
  }

  /**
   * Centralized event wiring:
   * - Stops bubbling out of this item
   * - Direct listeners for Edit/Delete/Relation
   * - Click on the summary background toggles selection
   */
  private _attachEventDelegation(): void {
    const { signal } = this._events;

    // Prevent clicks from bubbling outside of this condition item.
    this.rootEl.addEventListener('click', (e) => e.stopImmediatePropagation(), {
      signal,
    });

    // Delete
    this._btnDelete.addEventListener(
      'click',
      (e) => {
        e.stopImmediatePropagation();
        this._builder.deleteCondition([this]);
      },
      { signal }
    );

    // Edit
    this._btnEdit.addEventListener(
      'click',
      (e) => {
        e.stopImmediatePropagation();
        this._enterEditMode();
      },
      { signal }
    );

    // Relation (mouse)
    this._relationEl.addEventListener(
      'click',
      (e) => {
        e.stopImmediatePropagation();
        this._toggleRelation();
      },
      { signal }
    );

    // Relation (keyboard)
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

    // Background click inside summary toggles selection (excluding controls).
    this._summaryEl.addEventListener(
      'click',
      (e) => {
        const t = e.target as Element;
        if (t.closest('button, .relation')) return; // already handled
        this._toggleSelection(e);
      },
      { signal }
    );
  }

  /**
   * Toggle relation ('eq' <-> 'ne') if this type supports relation.
   * Also updates ARIA state and notifies the builder if the modal is not open.
   */
  private _toggleRelation(): void {
    if (!this._relationSupported) return;

    const next: Relation = this.rootEl.dataset.relation === 'eq' ? 'ne' : 'eq';
    this.rootEl.dataset.relation = next;
    this._relationEl.setAttribute('aria-pressed', String(next === 'ne'));

    if (!storeManager.getData('showModal')) {
      this._keepLastRelation = next;
      this._builder.changeCondition();
    }
  }

  /** Enter edit mode and bind the global Escape handler while the modal is open. */
  private _enterEditMode(): void {
    this.rootEl.classList.add('-editing');
    this._conditionValues.startToEditCondition();
    storeManager.setData('showModal', true);
    this._toggleGlobalKeydown(true);
  }

  /**
   * Attach/detach a single global keydown handler via AbortController.
   * Keeps the wiring localized to this instance.
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
   * Global Escape handler:
   * - On first-time edit, Esc removes the item
   * - Otherwise Esc restores previous state and exits edit mode
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

  /** Restore editor UI and last confirmed relation when canceling edits. */
  private _revertChanges(): void {
    for (const editor of this._conditionValues.editors) editor.restore();
    this.rootEl.dataset.relation = this._keepLastRelation;
  }
}
