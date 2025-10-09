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
    private readonly _conditionValues: ConditionValues,
    private readonly _conditionItemView: ConditionItemView
  ) {}

  // ───────────────────────────────────────────────────────────────────────────
  // DOM Creation
  // ───────────────────────────────────────────────────────────────────────────

  /** Create an element for the edit screen. */
  protected createSectionEl(
    className: EditorSectionClassName,
    content: SectionContent
  ): HTMLElement {
    const sectionEl = createEl('section', {
      class: className,
      dataset: { conditionType: String(this.conditionType) },
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

    this._conditionValues.sections.append(sectionEl);
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
      valueView.conditionType = this.conditionType;
      valueView.deleteButton = showDeleteButton;
      this.valuesContainerEl.append(valueView);
    }

    valueView.label = label;
    valueView.value = value;
    return valueView;
  }

  /** Delete if argument value contains a value */
  protected removeValueView(value: string): void {
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
    return this._conditionItemView;
  }

  /** Access to the condition values component */
  protected get conditionValues(): ConditionValues {
    return this._conditionValues;
  }

  /** Get the condition type from the parent view */
  protected get conditionType(): ConditionTypeValue {
    return this._conditionItemView.conditionType;
  }

  // div.values which is a wrapper for condition-item-value-view
  protected get valuesContainerEl(): HTMLDivElement {
    return this._conditionItemView.valuesContainerEl;
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
