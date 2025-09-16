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

const NO_RELATION_TYPES = new Set<ConditionTypeValue>([
  'dataset',
  'genotype',
  'pathogenicity_prediction',
  'id',
  'location',
]);

/**
 * Represents a condition item view for editing and deleting search conditions.
 * This class extends BaseConditionView and manages individual search conditions.
 */
export class ConditionItemView extends BaseConditionView {
  readonly conditionNodeKind = CONDITION_NODE_KIND.condition;

  private readonly _conditionType: ConditionTypeValue;
  private _isFirstTime = true;
  private _keepLastRelation: Relation = 'eq';

  private _valuesEl!: HTMLDivElement;
  private _editorEl!: HTMLDivElement;
  private _conditionValues: ConditionValues | undefined;

  private get _summaryEl(): HTMLDivElement {
    const el = this.rootEl.querySelector(':scope > .body > .summary');
    if (!el) throw new Error('summary element not found');
    return el as HTMLDivElement;
  }
  private get _relationEl(): HTMLDivElement {
    const el = this._summaryEl.querySelector(':scope > .relation');
    if (!el) throw new Error('relation element not found');
    return el as HTMLDivElement;
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
    this._enterEditMode();
  }

  /** Exits edit mode and triggers condition search */
  doneEditing(): void {
    this.rootEl.classList.remove('-editing');
    this._isFirstTime = false;
    this._toggleGlobalKeydown(false);
    storeManager.setData('showModal', false);
    this._builder.changeCondition();
  }

  /** Removes the condition item and cleans up resources */
  remove(): void {
    this._conditionValues = undefined as any;
    this._toggleGlobalKeydown(false);
    storeManager.setData('showModal', false);
    super.remove();
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
    const relation = (this.rootEl.dataset.relation ?? '') as Relation;
    const values = Array.from(
      this._valuesEl.querySelectorAll(':scope > condition-item-value-view')
    ) as ConditionItemValueViewElement[];
    return buildQueryFragment({
      type: this._conditionType,
      relation,
      values,
      valuesContainer: this._valuesEl, // significance builder uses this
    });
  }

  /** Initializes the HTML structure for the condition item */
  private _initializeHTML(): void {
    this.rootEl.classList.add('advanced-search-condition-item-view');
    this.rootEl.dataset.classification = this._conditionType;
    this.rootEl.dataset.relation = NO_RELATION_TYPES.has(this._conditionType)
      ? ''
      : 'eq';
    this.rootEl.innerHTML = this._generateHTML();
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

  /** クリック・キーダウンを委譲でハンドリング */
  private _attachEventDelegation(): void {
    // 自要素内のクリックは外に飛ばさない
    this.rootEl.addEventListener('click', (e) => e.stopImmediatePropagation());

    // summary 内の全ボタン/領域を1箇所で
    this._summaryEl.addEventListener('click', (e) => {
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
      // それ以外の summary クリックは選択トグル
      this._toggleSelection(e);
    });
  }

  /** Toggles the logical relation between 'eq' and 'ne' */
  private _toggleRelation(): void {
    const next: Relation = this.rootEl.dataset.relation === 'eq' ? 'ne' : 'eq';
    this.rootEl.dataset.relation = next;
    if (!storeManager.getData('showModal')) {
      this._keepLastRelation = next;
      this._builder.changeCondition();
    }
  }

  /** Enters edit mode for the condition */
  private _enterEditMode(): void {
    this.rootEl.classList.add('-editing');
    this._conditionValues!.startToEditCondition();
    storeManager.setData('showModal', true);
    this._toggleGlobalKeydown(true);
  }

  // 編集モード中の Esc 管理を一元化
  private _toggleGlobalKeydown(enable: boolean): void {
    const fn = this._keydownEscapeEvent;
    if (enable) window.addEventListener('keydown', fn);
    else window.removeEventListener('keydown', fn);
  }

  /** Handles escape key press to exit edit mode */
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

  /** Reverts all changes made during editing */
  private _revertChanges(): void {
    for (const editor of this._conditionValues!.editors) editor.restore();
    this.rootEl.dataset.relation = this._keepLastRelation;
  }
}
