import { ConditionView } from './ConditionView';
import ConditionItemView from './ConditionItemView';
import { CONDITION_ITEM_TYPE } from '../../definition.js';
import type AdvancedSearchBuilderView from '../AdvancedSearchBuilderView';

export class ConditionGroupView extends ConditionView {
  private _isRoot: boolean;
  private _logicalOperatorSwitch: HTMLElement | null;
  private _container: HTMLElement | null;
  private _mutationObserver: MutationObserver;

  constructor(
    builder: AdvancedSearchBuilderView,
    parentView: ConditionView & { container: HTMLElement },
    logicalOperator: string = 'and',
    conditionViews: ConditionView[] = [],
    referenceElm: Node | null = null,
    isRoot: boolean = false
  ) {
    super(CONDITION_ITEM_TYPE.group, builder, parentView, referenceElm);

    // make HTML
    this._conditionViewEl.classList.add('advanced-search-condition-group-view');
    this._isRoot = isRoot;
    if (isRoot) this._conditionViewEl.classList.add('-root');
    this._conditionViewEl.dataset.numberOfChild =
      conditionViews.length.toString();
    this._conditionViewEl.innerHTML = `<div class="logical-operator-switch"></div>
    <div class="container"></div>`;

    // reference
    this._logicalOperatorSwitch = this._conditionViewEl.querySelector(
      ':scope > .logical-operator-switch'
    );
    this._container = this._conditionViewEl.querySelector(
      ':scope > .container'
    );

    // contents
    for (const conditionView of conditionViews) {
      if (this._container) {
        this._container.append(conditionView.elm);
      }
      conditionView.parentView = this;
    }

    // logical operator
    if (this._logicalOperatorSwitch) {
      this._logicalOperatorSwitch.dataset.operator = logicalOperator;
    }

    // events
    // select/deselect
    if (!isRoot)
      this._conditionViewEl.addEventListener(
        'click',
        this.toggleSelectionState.bind(this)
      );
    // switch logical operator
    if (this._logicalOperatorSwitch) {
      this._logicalOperatorSwitch.addEventListener('click', (e: MouseEvent) => {
        e.stopImmediatePropagation();
        if (
          this._logicalOperatorSwitch &&
          this._logicalOperatorSwitch.dataset.operator
        ) {
          this._logicalOperatorSwitch.dataset.operator = {
            and: 'or',
            or: 'and',
          }[this._logicalOperatorSwitch.dataset.operator];
        }
        this._doneEditing();
      });
    }
    // mutation
    this._mutationObserver = this._defineObserveConditions();
  }

  private _doneEditing() {
    this._builder.changeCondition();
  }

  // public methods

  makeToolbar(): HTMLElement {
    const toolbar = document.createElement('nav');
    this._conditionViewEl.append(toolbar);
    return toolbar;
  }

  addNewConditionItem(
    conditionType: string,
    options: any,
    referenceElm: Node | null = null
  ): ConditionItemView {
    const conditionView = new ConditionItemView(
      this._builder,
      this,
      conditionType,
      options,
      referenceElm
    );
    return conditionView;
  }

  addNewConditionGroup(
    conditionViews: ConditionView[],
    referenceElm: Node | null
  ): ConditionGroupView {
    const conditionGroupView = new ConditionGroupView(
      this._builder,
      this,
      'or',
      conditionViews,
      referenceElm
    );
    return conditionGroupView;
  }

  ungroup(): void {
    const conditionViews = Array.from(
      this._container?.querySelectorAll(
        ':scope > .advanced-search-condition-view'
      ) || []
    );
    if (this.parentView instanceof ConditionGroupView) {
      this.parentView.addConditionViews(conditionViews, this.elm);
    }
    this.remove();
  }

  addConditionViews(conditionViews: Node[], referenceElm: Node | null): void {
    for (const view of conditionViews) {
      this._container?.insertBefore(view, referenceElm);
    }
  }

  removeConditionView(conditionView: ConditionView): void {
    if (this._container) {
      this._container.removeChild(conditionView.elm);
    }
  }

  remove(): void {
    this._mutationObserver.disconnect();
    super.remove();
  }

  private _defineObserveConditions(): MutationObserver {
    const config = { attributes: false, childList: true, subtree: false };
    const callback = (mutationsList: MutationRecord[]) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          const numberOfChild = this._numberOfChild;
          this._conditionViewEl.dataset.numberOfChild =
            numberOfChild.toString();
          // if the number of child is less than 2, ungroup
          if (!this._isRoot && numberOfChild <= 1) this.ungroup();
        }
      }
    };
    const observer = new MutationObserver(callback);
    if (this._container) {
      observer.observe(this._container, config);
    }
    return observer;
  }

  // accessor

  get query(): object {
    const children = Array.from(
      this._container?.querySelectorAll(
        ':scope > .advanced-search-condition-view'
      ) || []
    );
    switch (this._numberOfChild) {
      case 0:
        return {};
      case 1: {
        const firstChild = children[0];
        if ('delegate' in firstChild) {
          return (firstChild as { delegate: any }).delegate.query;
        }
        throw new Error('Delegate property is missing');
      }
      default:
        return {
          [this._logicalOperatorSwitch?.dataset.operator || 'and']:
            children.map((el) => {
              if ('delegate' in el) {
                return (el as { delegate: any }).delegate.query;
              }
              throw new Error('Delegate property is missing');
            }),
        };
    }
  }

  get container(): HTMLElement {
    if (!this._container) {
      throw new Error('Container is not initialized');
    }
    return this._container;
  }

  get childViews(): ConditionView[] {
    return Array.from(this._container?.childNodes || []).map(
      (el: any) => el.delegate
    );
  }

  private get _numberOfChild(): number {
    return (
      this._container?.querySelectorAll(
        ':scope > .advanced-search-condition-view'
      ).length || 0
    );
  }
}
