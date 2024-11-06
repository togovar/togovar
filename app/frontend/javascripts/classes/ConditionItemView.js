import ConditionView from './ConditionView.js';
import ConditionValues from './ConditionValues.js';
import StoreManager from './StoreManager.js';
import { ADVANCED_CONDITIONS } from '../global.js';
import { CONDITION_TYPE, CONDITION_ITEM_TYPE } from '../definition.js';
import { keyDownEvent } from '../utils/keyDownEvent.js';

/** Class for editing and deleting conditions
 * Create an instance with {@link ConditionGroupView}
 * @extends ConditionView */
class ConditionItemView extends ConditionView {
  /**
   * @param {AdvancedSearchBuilderView} builder - AdvancedSearchBuilderView is a class that operates the search condition builder. Called when the search conditions change.
   * @param {ConditionGroupView} parentView - ConditonGroupView that contains ConditoinItemView
   * @param {string} conditionType - dataset, significance, consequence, disease, gene, id, location, type
   * @param {0|1} conditionItemType ConditionItemView represents "0", ConditionGroupView represents "1".
   * @param {Node} referenceElm */
  constructor(
    builder,
    parentView,
    conditionType,
    conditionItemType,
    referenceElm = null
  ) {
    super(CONDITION_ITEM_TYPE.condition, builder, parentView, referenceElm);
    /** @property {string} _conditionType - condition type (gene, id, dataset, location, etc.) */
    this._conditionType = conditionType;
    /** @property {boolean} _isFirstTime - whether this is the first time to edit. (Relates to whether the element is deleted with the cancel button) */
    this._isFirstTime = true;
    /** @property {boolean} _keepLastRelation - Save equal and negative conditions for canceling */
    this._keepLastRelation = 'eq';

    // make HTML
    this._elm.classList.add('advanced-search-condition-item-view');
    this._elm.dataset.classification = conditionType;
    this._elm.dataset.relation = [
      'dataset',
      'pathogenicity_prediction',
      'id',
      'location',
    ].includes(conditionType)
      ? ''
      : 'eq';
    this._elm.innerHTML = `
    <div class="body">
      <div class="summary">
        <div class="classification">${ADVANCED_CONDITIONS[conditionType].label}</div>
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

    // reference
    const body = this._elm.querySelector(':scope > .body');
    const summary = body.querySelector(':scope > .summary');
    /** @property {HTMLDivElement} _valuesEl - div.values */
    this._valuesEl = summary.querySelector(':scope > .values');
    /** @property {HTMLDivElement} _editorEl - div.advanced-search-condition-editor-view */
    this._editorEl = body.querySelector(
      ':scope > .advanced-search-condition-editor-view'
    );
    /** @property {ConditionValues} _conditionValues */
    this._conditionValues = new ConditionValues(this, conditionItemType);

    // events
    // stop propagation
    this._elm.addEventListener('click', (e) => {
      e.stopImmediatePropagation();
    });
    // select/deselect
    summary.addEventListener('click', this._toggleSelecting.bind(this));
    // toggle logical operation
    summary
      .querySelector(':scope > .relation')
      .addEventListener('click', (e) => {
        e.stopImmediatePropagation();
        this._elm.dataset.relation = { eq: 'ne', ne: 'eq' }[
          this._elm.dataset.relation
        ];
        if (!StoreManager.getData('showModal')) {
          this._keepLastRelation = this._elm.dataset.relation;
          this._builder.changeCondition();
        }
      });
    //  Edit and delete button settings
    for (const button of summary.querySelectorAll(
      ':scope > .buttons > button'
    )) {
      button.addEventListener('click', (e) => {
        e.stopImmediatePropagation();
        switch (e.target.className) {
          case 'edit':
            this._elm.classList.add('-editing');
            this._conditionValues.startToEditCondition();
            StoreManager.setData('showModal', true);
            window.addEventListener('keydown', this.#keydownEscapeEvent);
            break;
          case 'delete':
            this._builder.delete([this]);
            break;
        }
      });
    }

    window.addEventListener('keydown', this.#keydownEscapeEvent);

    // Automatically enters editing state when instance is created
    summary
      .querySelector(':scope > .buttons > button.edit')
      .dispatchEvent(new Event('click'));
  }

  // public methods
  /** Exit from editscreen and search for condition */
  doneEditing() {
    this._elm.classList.remove('-editing');
    this._isFirstTime = false;
    this._builder.changeCondition();
    StoreManager.setData('showModal', false);
    window.removeEventListener('keydown', this.#keydownEscapeEvent);
  }

  /**
   * Used in _clickCancelButton of {@link ConditionValues} */
  remove() {
    delete this._conditionValues;
    super.remove();
    StoreManager.setData('showModal', false);
    window.removeEventListener('keydown', this.#keydownEscapeEvent);
  }

  // private methods
  /** @private */
  #keydownEscapeEvent = this.#keydownEscape.bind(this);
  /** Exit the edit screen with esckey. remove() for the first time, doneEditing() for editing
   * @private */
  #keydownEscape(e) {
    if (
      e.key !== 'Escape' ||
      !this._conditionValues ||
      !StoreManager.getData('showModal')
    )
      return;

    if (keyDownEvent('showModal')) {
      if (this._isFirstTime) {
        this.remove();
      } else {
        for (const editor of this._conditionValues.editors) {
          editor.restore();
          this._elm.dataset.relation = this._keepLastRelation;
        }
        this.doneEditing();
      }
    }
  }

  // accessor
  /** conditionType(gene, id, dataset, location, etc.)
   * @type {string} */
  get conditionType() {
    return this._conditionType;
  }

  /** div.values
   *  @type {HTMLDivElement} */
  get valuesElement() {
    return this._valuesEl;
  }

  /** div.advanced-search-condition-editor-view
   *  @type {HTMLDivElement} */
  get editorElement() {
    return this._editorEl;
  }

  /** @type {boolean} */
  get isFirstTime() {
    return this._isFirstTime;
  }

  /** @type {string} */
  get keepLastRelation() {
    return this._keepLastRelation;
  }

  /** Create each advanced search query
   * @see {@link https://grch38.togovar.org/api} -  Schemas
   * @type {Object} */
  get query() {
    const valueElements = Array.from(
      this._valuesEl.querySelectorAll(':scope > condition-item-value-view')
      // this._elm
      //   .querySelector(':scope > .body > .summary > .values')
      //   .querySelectorAll(':scope > condition-item-value-view')
    );

    switch (this._conditionType) {
      case CONDITION_TYPE.dataset: {
        const queries = valueElements.map((view) => {
          return view.shadowRoot.querySelector('frequency-count-value-view')
            .queryValue;
        });
        return queries.length <= 1 ? queries[0] : { or: queries };
      }

      case CONDITION_TYPE.pathogenicity_prediction: {
        return valueElements[0].shadowRoot.querySelector(
          'prediction-value-view'
        ).queryValue;
      }

      case CONDITION_TYPE.location: {
        const value = valueElements[0].value;
        let [chromosome, position] = value.split(':');
        position = position.split('-');
        if (position.length === 1) {
          position = +position[0];
        } else {
          position = {
            gte: +position[0],
            lte: +position[1],
          };
        }
        return {
          location: { chromosome, position },
        };
      }

      case CONDITION_TYPE.gene_symbol: {
        const queryId = valueElements[0]?.value;
        return {
          gene: {
            relation: this._elm.dataset.relation,
            terms: [Number(queryId)],
          },
        };
      }

      //Create a new array ids by extracting the values of the value property from each element in valueElements
      case CONDITION_TYPE.variant_id: {
        const ids = valueElements.map(({ value }) => value);
        return {
          id: ids,
        };
      }

      case CONDITION_TYPE.significance: {
        const valueMgendElements = Array.from(
          this._valuesEl.querySelectorAll(':scope > .mgend-wrapper > .mgend-condition-wrapper > condition-item-value-view')
        );
        const valueClinvarElements = Array.from(
          this._valuesEl.querySelectorAll(':scope > .clinvar-wrapper > .clinvar-condition-wrapper > condition-item-value-view')
        );

        // relationがneのときはand、それ以外はor
        const relationType = this._elm.dataset.relation === "ne" ? "and" : "or";
        const mgendCondition = valueMgendElements.length > 0 ? {
          [this._conditionType]: {
            relation: this._elm.dataset.relation,
            source: ["mgend"],
            terms: valueMgendElements.map((value) => value.value),
          },
        } : null;

        const clinvarCondition = valueClinvarElements.length > 0 ? {
          [this._conditionType]: {
            relation: this._elm.dataset.relation,
            source: ["clinvar"],
            terms: valueClinvarElements.map((value) => value.value),
          },
        } : null;

        // mgendまたはclinvarが存在する場合に応じて返す内容を変化
        const conditions = [mgendCondition, clinvarCondition].filter(Boolean);

        // conditionsの中身が1つの場合は直接返し、2つの場合はor/andでラップ
        const result = conditions.length === 1 ? conditions[0] : { [relationType]: conditions };

        console.log(result);
        return result;
      }

      default:
        return {
          [this._conditionType]: {
            relation: this._elm.dataset.relation,
            terms: valueElements.map((value) => value.value),
          },
        };
    }
  }
}

export default ConditionItemView;
