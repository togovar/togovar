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
 * Represents a single condition item row with edit/delete behaviors.
 * Extends BaseConditionView and manages its own value editors and relation state.
 */
export class ConditionItemView extends BaseConditionView {
  readonly conditionNodeKind = CONDITION_NODE_KIND.condition;

  private readonly _conditionType: ConditionTypeValue;
  private readonly _relationSupported: boolean;
  private _isFirstTime = true;
  private _keepLastRelation: Relation = 'eq';

  private _summaryEl!: HTMLDivElement;
  private _relationEl!: HTMLDivElement;
  private _valuesEl!: HTMLDivElement;
  private _btnEdit!: HTMLButtonElement;
  private _btnDelete!: HTMLButtonElement;
  private _editorEl!: HTMLDivElement;
  private _conditionValues!: ConditionValues;

  /** Controller to abort all event listeners added by this instance at once. */
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

    // this._conditionValues?.destroy?.(); // If ConditionValues has a destroy method
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

    // Determine if this condition type supports a relation; set initial to 'eq'.
    this.rootEl.dataset.relation = this._relationSupported ? 'eq' : '';

    const { body, bg } = this._generateDOM();
    this.rootEl.replaceChildren(body, bg);

    this._syncRelationUI();
  }

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

  /** Template markup for this condition item. Prefer `createElement` if you need stronger refs. */
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

    return { body: body, bg: bg };
  }

  /** Centralized click delegation within the item; stops propagation to parent containers. */
  private _attachEventDelegation(): void {
    const { signal } = this._events;

    this.rootEl.addEventListener('click', (e) => e.stopImmediatePropagation(), {
      signal,
    });

    // ボタンは直接バインドでもOK（すでに参照を保持しているため）
    this._btnDelete.addEventListener(
      'click',
      (e) => {
        e.stopImmediatePropagation();
        this._builder.deleteCondition([this]);
      },
      { signal }
    );

    this._btnEdit.addEventListener(
      'click',
      (e) => {
        e.stopImmediatePropagation();
        this._enterEditMode();
      },
      { signal }
    );

    this._relationEl.addEventListener(
      'click',
      (e) => {
        e.stopImmediatePropagation();
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

    // 空白部クリックで選択トグルを維持したいなら summary へも直接バインド
    this._summaryEl.addEventListener(
      'click',
      (e) => {
        const t = e.target as Element;
        if (t.closest('button, .relation')) return; // 既に個別ハンドラが処理
        this._toggleSelection(e);
      },
      { signal }
    );
  }

  /** Toggle relation state between 'eq' and 'ne', then notify if modal is not open. */
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
