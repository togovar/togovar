import { BaseConditionView } from './ConditionView';
import ConditionValues from './ConditionValues';
import { storeManager } from '../../store/StoreManager';
import {
  supportsRelation,
  type NoRelationType,
  type KeysWithRelation,
} from '../../conditions';
import { ADVANCED_CONDITIONS } from '../../global';

import { CONDITION_NODE_KIND, type ConditionTypeValue } from '../../definition';
import { keyDownEvent } from '../../utils/keyDownEvent.js';
import { buildQueryFragment } from './queryBuilders';
import { createEl } from '../../utils/dom/createEl';
import type { AdvancedSearchBuilderView } from '../AdvancedSearchBuilderView';
import type { ConditionGroupView } from './ConditionGroupView';
import type {
  ConditionQuery,
  Relation,
  ConditionDefinition,
} from '../../types';
import type { ConditionItemValueView } from '../../components/ConditionItemValueView';

/**
 * A single condition row with edit/delete behaviors.
 * Owns its editor(s), relation state, and all event wiring for the row.
 */
export class ConditionItemView extends BaseConditionView {
  readonly conditionNodeKind = CONDITION_NODE_KIND.condition;

  private readonly _conditionType: ConditionTypeValue;
  private readonly _relationSupported: boolean;

  private _isFirstTime = true;
  private _keepLastRelation: Relation = 'eq'; // restored when user cancels with Esc.

  // DOM references
  private _summaryEl!: HTMLDivElement;
  private _relationEl!: HTMLDivElement;
  private _valuesContainerEl!: HTMLDivElement;
  private _btnEdit!: HTMLButtonElement;
  private _btnDelete!: HTMLButtonElement;
  private _editorEl!: HTMLDivElement;

  /** Manages concrete editors (checkboxes, selects, etc.) inside this row. */
  private _conditionValues!: ConditionValues;

  /** Single controller to clean up every listener added by this instance. */
  private readonly _events = new AbortController();

  /**
   * @param builder      Owning AdvancedSearchBuilderView (for callbacks)
   * @param parentGroup  The logical parent group view
   * @param conditionType Type discriminator for this row
   * @param referenceElm  Insert before this node (or appended when null)
   */
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

  // ───────────────────────────────────────────────────────────────────────────
  // Public API (called by outer components)
  // ───────────────────────────────────────────────────────────────────────────

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

  // ───────────────────────────────────────────────────────────────────────────
  // Read-only accessors
  // ───────────────────────────────────────────────────────────────────────────
  get conditionType(): ConditionTypeValue {
    return this._conditionType;
  }
  get valuesContainerEl(): HTMLDivElement {
    return this._valuesContainerEl;
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

  // ───────────────────────────────────────────────────────────────────────────
  // Query building
  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Build a query fragment from the current UI and relation state.
   * Note: relation is undefined for types that do not support it.
   */
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
  // DOM creation / initial sync
  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Set up static structure and initial dataset attributes on the root element.
   * - classification: the condition type
   * - relation: 'eq' or 'ne' if supported; removed when unsupported
   * - children: built by _generateDOM()
   */
  private _initializeHTML(): void {
    this.rootEl.classList.add('advanced-search-condition-item-view');
    this.rootEl.dataset.classification = this._conditionType;

    if (this._relationSupported) {
      this.rootEl.dataset.relation = 'eq';
    } else {
      delete this.rootEl.dataset.relation;
    }

    const { body, bg } = this._generateDOM();
    this.rootEl.replaceChildren(body, bg);
    this._setRelation(this._readRelation());
  }

  /**
   * Create the inner DOM using `createEl` and cache important nodes.
   * We keep direct references (buttons, relation, values…) to avoid repeated queries.
   */
  private _generateDOM(): { body: HTMLDivElement; bg: HTMLDivElement } {
    const cond = ADVANCED_CONDITIONS[
      this._conditionType
    ] as ConditionDefinition;

    const relationChild = this._relationSupported
      ? (this._relationEl = createEl('div', {
          class: 'relation',
          attrs: {
            role: 'button',
            'aria-label': 'Toggle relation',
            tabindex: '0',
          },
        }))
      : null;

    this._summaryEl = createEl('div', {
      class: 'summary',
      children: [
        // TODO: In the future, implement drag-and-drop ordering.
        createEl('div', { class: 'classification', text: cond.label }),
        ...(relationChild ? [relationChild] : []),
        (this._valuesContainerEl = createEl('div', {
          class: 'values-container',
        })),
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

  // ───────────────────────────────────────────────────────────────────────────
  // Event wiring
  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Centralized event wiring:
   * - Stops bubbling out of this item
   * - Direct listeners for Edit/Delete/Relation
   * - Click on the summary background toggles selection
   */
  private _attachEventDelegation(): void {
    const { signal } = this._events;

    // Prevent clicks from bubbling outside of this condition item.
    this.rootEl.addEventListener('click', (e) => e.stopPropagation(), {
      signal,
    });

    // Delete
    this._btnDelete.addEventListener(
      'click',
      (e) => {
        e.stopPropagation();
        this._builder.deleteCondition([this]);
      },
      { signal }
    );

    // Edit
    this._btnEdit.addEventListener(
      'click',
      (e) => {
        e.stopPropagation();
        this._enterEditMode();
      },
      { signal }
    );

    // Relation (mouse)
    if (this._relationSupported && this._relationEl) {
      this._relationEl.addEventListener(
        'click',
        (e) => {
          e.stopPropagation();
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
    }

    // Background click inside summary toggles selection (excluding controls).
    this._summaryEl.addEventListener(
      'click',
      (e) => {
        const t = e.target as Element;
        if (t.closest('button, .relation')) return; // handled above
        this._toggleSelection(e);
      },
      { signal }
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Relation helpers
  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Toggle relation ('eq' <-> 'ne') if this type supports relation.
   * Also updates ARIA state and notifies the builder if the modal is not open.
   */
  private _toggleRelation(): void {
    if (!this._relationSupported) return;
    const cur = this._readRelation() ?? 'eq';
    const next: Relation = cur === 'eq' ? 'ne' : 'eq';
    this._setRelation(next);

    if (!storeManager.getData('showModal')) {
      this._keepLastRelation = next;
      this._builder.changeCondition();
    }
  }

  /** Read relation from dataset. returns undefined when unsupported or absent. */
  private _readRelation(): Relation | undefined {
    if (!this._relationSupported) return undefined;
    const r = this.rootEl.dataset.relation;
    return r === 'eq' || r === 'ne' ? r : undefined;
  }

  /**
   * Normalize and write relation to dataset, then sync ARIA.
   * When unsupported: clear the attribute and do not show ARIA pressed state.
   */
  private _setRelation(next: Relation | undefined): void {
    if (!this._relationSupported) {
      delete this.rootEl.dataset.relation;
      return;
    }
    if (!next) next = 'eq';
    this.rootEl.dataset.relation = next;
    if (this._relationEl) {
      this._relationEl.setAttribute('aria-pressed', String(next === 'ne'));
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Edit mode helpers (modal lifecycle)
  // ───────────────────────────────────────────────────────────────────────────
  /** Enter edit mode and bind the global Escape handler while the modal is open. */
  private _enterEditMode(): void {
    this.rootEl.classList.add('-editing');
    this._conditionValues.startToEditCondition();
    storeManager.setData('showModal', true);
    this._toggleGlobalKeydown(true);
  }

  /**
   * Attach/detach a single global keydown handler via AbortController.
   * This keeps the wiring localized to this instance.
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
   * - On first edit, Esc removes the item entirely
   * - Otherwise, Esc restores previous state and exits edit mode
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
    this._setRelation(
      this._relationSupported ? this._keepLastRelation : undefined
    );
  }
}
