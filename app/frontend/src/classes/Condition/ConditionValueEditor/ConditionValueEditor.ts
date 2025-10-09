import { createEl } from '../../../utils/dom/createEl';
import { selectRequired, selectOrNull } from '../../../utils/dom/select';
import type { ConditionItemValueView } from '../../../components/ConditionItemValueView';
import type { ConditionTypeValue } from '../../../definition';
import type ConditionValues from '../ConditionValues';
import type { ConditionItemView } from '../ConditionItemView';
import type { EditorSectionClassName } from '../../../types';

type SectionChildren = ReadonlyArray<Node | string>;
type SectionContent =
  | string
  | DocumentFragment
  | SectionChildren
  | (() => SectionChildren);

export class ConditionValueEditor {
  private _sectionEl: HTMLElement | null = null;

  constructor(
    protected readonly _valuesView: ConditionValues,
    protected readonly _conditionView: ConditionItemView
  ) {}

  /** Create an element for the edit screen. */
  protected createSectionEl(
    className: EditorSectionClassName,
    content: SectionContent
  ): HTMLElement {
    const sectionEl = createEl('section', {
      class: className,
      dataset: { conditionType: String(this._conditionType) },
    });

    if (typeof content === 'string') {
      sectionEl.innerHTML = content;
    } else {
      const list =
        typeof content === 'function'
          ? content()
          : content instanceof DocumentFragment
          ? [content]
          : content;

      const frag = document.createDocumentFragment();
      for (const n of list) {
        frag.append(n instanceof Node ? n : document.createTextNode(String(n)));
      }
      sectionEl.append(frag);
    }

    this._valuesView.sections.append(sectionEl);
    this._sectionEl = sectionEl;
    return sectionEl;
  }

  /** If there is only one value in the condition, update it,
   * for multiple values, add them without duplicates. (for variant id)
   */
  protected addValueView(
    value: string,
    label: string,
    isOnly = false,
    showDeleteButton = false
  ): ConditionItemValueView {
    const selector = isOnly ? '' : `[data-value="${value}"]`;
    let valueView = selectOrNull<ConditionItemValueView>(
      this.valuesContainerEl,
      `condition-item-value-view${selector}`
    );

    if (!valueView) {
      // HTMLElementTagNameMap の拡張が効いていれば、型は自動的に ConditionItemValueView
      valueView = document.createElement('condition-item-value-view');
      valueView.conditionType = this._conditionType;
      valueView.deleteButton = showDeleteButton;
      this.valuesContainerEl.append(valueView);
    }

    valueView.label = label;
    valueView.value = value;
    return valueView;
  }

  /** Remove current condition value views and add last value views. (for variant id) */
  protected _updateValueViews(lastValueViews: ConditionItemValueView[]): void {
    this.conditionItemValueViews.forEach((view) => view.remove());
    this.valuesContainerEl.append(...lastValueViews);
  }

  /** Delete if argument value contains a value */
  protected _removeValueView(value: string): void {
    const selector = value ? `[data-value="${value}"]` : '';
    const view = selectOrNull<ConditionItemValueView>(
      this.valuesContainerEl,
      `condition-item-value-view${selector}`
    );
    if (view) view.remove();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Accessors
  // ───────────────────────────────────────────────────────────────────────────
  protected get sectionEl(): HTMLElement {
    if (!this._sectionEl) throw new Error('not mounted yet');
    return this._sectionEl;
  }

  protected get bodyEl(): HTMLElement {
    return selectRequired<HTMLElement>(
      this.sectionEl,
      ':scope > .body',
      'ConditionValueEditor.bodyEl'
    );
  }

  /** Access to the parent condition item view */
  protected get conditionItemView(): ConditionItemView {
    return this._conditionView;
  }

  protected get _conditionType(): ConditionTypeValue {
    return this.conditionItemView.conditionType;
  }

  // div.values which is a wrapper for condition-item-value-view
  protected get valuesContainerEl(): HTMLDivElement {
    return this.conditionItemView.valuesContainerEl;
  }

  /** Get all condition item value views. */
  protected get conditionItemValueViews(): ConditionItemValueView[] {
    return Array.from(
      this.valuesContainerEl.querySelectorAll<ConditionItemValueView>(
        ':scope > condition-item-value-view'
      )
    );
  }
}
