import type AdvancedSearchBuilderView from './AdvancedSearchBuilderView';
import type { ConditionView } from './Condition/ConditionView';

const BOUNDARY =
  '#AdvancedSearchBuilderView > .inner > .advanced-search-condition-group-view.-root > .container';
const SELECTED_SELECTOR =
  '.advanced-search-condition-group-view[aria-selected="true"], ' +
  '.advanced-search-condition-item-view[aria-selected="true"]';

export class AdvancedSearchSelection {
  private _builder: AdvancedSearchBuilderView;

  constructor(builder: AdvancedSearchBuilderView) {
    this._builder = builder;
  }

  getSelectingConditionViews() {
    const conditionEls = this._getSelectedConditionElements();

    if (conditionEls.length > 0) {
      // sort
      const siblingEls = Array.from(conditionEls[0].parentNode!.childNodes);
      conditionEls.sort(
        (el1, el2) => siblingEls.indexOf(el1) - siblingEls.indexOf(el2)
      );
    }
    return conditionEls.map((el) => el.delegate);
  }

  selectConditionView(view: ConditionView, deselectSelecting = true) {
    if (deselectSelecting) this.deselectAllConditions();
    const existing = this.getSelectingConditionViews();
    const siblings = view.siblingElms;
    existing.forEach((v) => {
      if (siblings.indexOf(v.elm) === -1) this.deselectConditionView(v);
    });

    view.select();
    view.elm.setAttribute('aria-selected', 'true');
    view.elm.classList.add('-selected');

    this._builder.selectedConditionViews(this.getSelectingConditionViews());
  }

  deselectConditionView(view: ConditionView) {
    view.deselect();
    view.elm.removeAttribute('aria-selected');
    view.elm.classList.remove('-selected');

    this._builder.selectedConditionViews(this.getSelectingConditionViews());
  }

  deselectAllConditions() {
    this._getSelectedConditionElements().forEach((el) => {
      el.delegate.deselect();
      el.removeAttribute('aria-selected');
      el.classList.remove('-selected');
    });
  }

  private _getSelectedConditionElements(): (HTMLElement & {
    delegate: ConditionView;
  })[] {
    const root = document.querySelector(BOUNDARY);
    if (!root) return [];
    return Array.from(
      root.querySelectorAll(SELECTED_SELECTOR)
    ) as (HTMLElement & { delegate: ConditionView })[];
  }
}
