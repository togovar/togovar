import { createEl } from '../../../utils/dom/createEl';
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
  protected _body: HTMLElement | null = null; // To be deleted in the future

  constructor(
    protected readonly _valuesView: ConditionValues,
    protected readonly _conditionView: ConditionItemView
  ) {}

  /** Create an element for the edit screen. */
  protected _createElement(
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
    this._body = sectionEl.querySelector<HTMLElement>(':scope > .body'); // To be deleted in the future
    this._sectionEl = sectionEl;
    return sectionEl;
  }

  /** If there is only one value in the condition, update it,
   * for multiple values, add them without duplicates. (for variant id)
   */
  protected _addValueView(
    value: string,
    label: string,
    isOnly = false,
    showDeleteButton = false
  ): ConditionItemValueView {
    const selector = isOnly ? '' : `[data-value="${value}"]`;
    let valueView = this._valuesElement.querySelector<ConditionItemValueView>(
      `condition-item-value-view${selector}`
    );

    if (!valueView) {
      // HTMLElementTagNameMap の拡張が効いていれば、型は自動的に ConditionItemValueView
      valueView = document.createElement('condition-item-value-view');
      valueView.conditionType = this._conditionType;
      valueView.deleteButton = showDeleteButton;
      this._valuesElement.append(valueView);
    }

    valueView.label = label;
    valueView.value = value;
    return valueView;
  }

  /** Remove all valueViews. */
  protected _clearValueViews(): void {
    this._valueViews.forEach((view) => view.remove());
  }

  /** Remove current valueViews and add lastValueViews. (for variant id) */
  protected _updateValueViews(lastValueViews: ConditionItemValueView[]): void {
    this._valueViews.forEach((view) => view.remove());
    this._valuesElement.append(...lastValueViews);
  }

  /** Delete if argument value contains a value */
  protected _removeValueView(value: string): void {
    const selector = value ? `[data-value="${value}"]` : '';
    const view = this._valuesElement.querySelector<ConditionItemValueView>(
      `condition-item-value-view${selector}`
    );
    if (view) view.remove();
  }

  protected get sectionEl(): HTMLElement {
    if (!this._sectionEl) throw new Error('not mounted yet');
    return this._sectionEl;
  }

  protected get bodyEl(): HTMLElement {
    const el = this.sectionEl.querySelector<HTMLDivElement>(':scope > .body');
    if (!el) throw new Error('columns-editor-view: .body not found');
    return el;
  }

  protected get _conditionType(): ConditionTypeValue {
    return this._conditionView.conditionType;
  }

  // div.values which is a wrapper for condition-item-value-view
  protected get _valuesElement(): HTMLDivElement {
    return this._valuesView.conditionView.valuesElement;
  }

  /** [condition-item-value-view] */
  protected get _valueViews(): ConditionItemValueView[] {
    return Array.from(
      this._valuesElement.querySelectorAll<ConditionItemValueView>(
        ':scope > condition-item-value-view'
      )
    );
  }
}
