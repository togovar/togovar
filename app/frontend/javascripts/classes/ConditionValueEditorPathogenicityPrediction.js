import ConditionValueEditor from './ConditionValueEditor.js';
import '../components/PathogenicityRangeSliderView.js';
// import { API_URL } from '../global.js';

const ALPHAMISSENSE_THRESHOLD = {
  'Likely benign': {
    color: '#9def3A',
    min: 0,
    max: 0.34,
  },
  Ambiguous: {
    color: '#bbba7e',
    min: 0.34,
    max: 0.564,
  },
  'Likely pathogenic': {
    color: '#ffae00',
    min: 0.564,
    max: 1,
  },
};

const SIFT_THRESHOLD = {
  Tolerated: {
    color: '#ff5a54',
    min: 0,
    max: 0.05,
  },
  Deleterious: {
    color: '#04af58',
    min: 0.05,
    max: 1,
  },
};

const POLYPHEN_THRESHOLD = {
  Benign: {
    color: '#04af58',
    min: 0,
    max: 0.446,
  },
  Possibly_damaging: {
    color: '#ffae00',
    min: 0.446,
    max: 0.908,
  },
  Probably_damaging: {
    color: '#ff5a54',
    min: 0.908,
    max: 1,
  },
};

/** Gene Search editing screen */
class ConditionValueEditorPathogenicityPrediction extends ConditionValueEditor {
  /**
   * @param {ConditionValues} valuesView
   * @param {ConditionItemView} conditionView */
  constructor(valuesView, conditionView) {
    super(valuesView, conditionView);
    /** @property {number} _value - value of the selected suggestion */
    this._value;
    /** @property {string} _label - label of the selected suggestion */
    this._label;

    // HTML
    this._createElement(
      'pathogenicity-editor-view',
      `<header>Select pathogenicity</header>
      <div class="body">
        <ul aria-labelledby="tabs-title" role="tablist">
          <li><a id="tab-1" href="#alphamissense">AlphaMissense</a></li>
          <li><a id="tab-2" href="#sift">SIFT</a></li>
          <li><a id="tab-3" href="#polyphen">PolyPhen</a></li>
        </ul>

        <div class="tabs-panels">
          <div id="alphamissense" aria-labelledby="tab-1"></div>
          <div id="sift" aria-labelledby="tab-2"></div>
          <div id="polyphen" aria-labelledby="tab-3"></div>
        </div>
      </div>`
    );

    const tabsContainer = this._el.querySelector('.body');
    const tabsList = tabsContainer.querySelector('ul');
    const tabButtons = tabsList.querySelectorAll('a');
    const tabPanels = this._el.querySelectorAll('.tabs-panels > div');

    tabButtons.forEach((tab, index) => {
      if (index === 0) {
        tab.setAttribute('aria-selected', true);
        tab.setAttribute('tabindex', '0');
      } else {
        tab.setAttribute('aria-selected', false);
        tab.setAttribute('tabindex', '-1');
        tabPanels[index].setAttribute('hidden', true);
      }
    });

    tabsContainer.addEventListener('click', (e) => {
      const clickedTab = e.target.closest('a');
      if (!clickedTab) return;
      e.preventDefault();

      switchTab(clickedTab);
    });

    function switchTab(clickedTab) {
      const activePanelId = clickedTab.getAttribute('href');
      const activePanel = tabsContainer.querySelector(activePanelId);

      tabButtons.forEach((button) => {
        button.setAttribute('aria-selected', false);
        button.setAttribute('tabindex', '-1');
      });

      tabPanels.forEach((panel) => {
        panel.setAttribute('hidden', true);
      });

      activePanel.removeAttribute('hidden', false);

      clickedTab.setAttribute('aria-selected', true);
      clickedTab.setAttribute('tabindex', '0');
    }

    // =======================================
    const alphamissenseRangeSlider = document.createElement(
      'pathogenicity-range-slider'
    );
    alphamissenseRangeSlider.pathogenicityThreshold = ALPHAMISSENSE_THRESHOLD;
    this._el
      .querySelector('#alphamissense')
      .appendChild(alphamissenseRangeSlider);

    const siftRangeSlider = document.createElement(
      'pathogenicity-range-slider'
    );
    siftRangeSlider.pathogenicityThreshold = SIFT_THRESHOLD;
    this._el.querySelector('#sift').appendChild(siftRangeSlider);

    const polyphenRangeSlider = document.createElement(
      'pathogenicity-range-slider'
    );
    polyphenRangeSlider.pathogenicityThreshold = POLYPHEN_THRESHOLD;
    this._el.querySelector('#polyphen').appendChild(polyphenRangeSlider);
  }

  // public methods
  /** Retain value when changing to edit screen
   * See {@link ConditionValues} startToEditCondition */
  keepLastValues() {
    let valueView = this._valuesElement.querySelector(
      'condition-item-value-view'
    );

    this._lastValue = valueView?.value || '';
    this._lastLabel = valueView?.label || '';
  }

  /** If the cancel button is pressed when isFirstTime is false, restore the value before editing
   *  See {@link ConditionValues} _clickCancelButton */
  restore() {
    this._addValueView(this._lastValue, this._lastLabel, true);
  }

  /** Change whether okbutton can be pressed
   * @private */
  #update() {
    this._valuesView.update(this.#validate());
  }

  /** Whether you can press the ok button
   * @private
   * @returns {boolean} */
  #validate() {
    return this.isValid;
  }

  //accessor
  /** You can press the ok button if there is condition-item-value-view
   * @type {boolean} */
  get isValid() {
    return this._valueViews.length > 0;
  }
}

export default ConditionValueEditorPathogenicityPrediction;
