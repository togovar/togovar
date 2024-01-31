import ConditionValueEditor from './ConditionValueEditor.js';
import '../components/PathogenicityRangeSliderView.js';

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
    /** @property {string} _dataset - value of the selected suggestion */
    this._dataset = 'alphamissense';
    /** @property {string} _label - label of the selected suggestion */
    this._label = 'AlphaMissense';
    /** @property {array} _value - value of the selected suggestion */
    this._values = [0, 1];

    // HTML
    this._createElement(
      'pathogenicity-editor-view',
      `<header>Select pathogenicity</header>
      <div class="body">
        <ul aria-labelledby="tabs-title" role="tablist">
          <li><a id="tab-1" class="tab" href="#alphamissense" data-dataset="alphamissense">AlphaMissense</a></li>
          <li><a id="tab-2" class="tab" href="#sift" data-dataset="sift">SIFT</a></li>
          <li><a id="tab-3" class="tab" href="#polyphen" data-dataset="polyphen">PolyPhen</a></li>
        </ul>

        <div class="tabs-panels">
          <div id="alphamissense" aria-labelledby="tab-1" data-min-value="0" data-max-value="1"></div>
          <div id="sift" aria-labelledby="tab-2" data-min-value="0" data-max-value="1"></div>
          <div id="polyphen" aria-labelledby="tab-3" data-min-value="0" data-max-value="1"></div>
        </div>
      </div>`
    );

    const tabsContainer = this._el.querySelector('.body');
    this._tabsContainer = this._el.querySelector('.body');
    const tabsList = tabsContainer.querySelector('ul[role="tablist"]');
    this._tabsList = tabsContainer.querySelector('ul[role="tablist"]');
    const tabButtons = tabsList.querySelectorAll('li > a.tab');
    this._tabButtons = tabsList.querySelectorAll('li > a.tab');
    const tabPanels = tabsContainer.querySelectorAll('.tabs-panels > div');
    this._tabPanels = tabsContainer.querySelectorAll('.tabs-panels > div');

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

    this._createRangeSlider('alphamissense', ALPHAMISSENSE_THRESHOLD);
    this._createRangeSlider('sift', SIFT_THRESHOLD);
    this._createRangeSlider('polyphen', POLYPHEN_THRESHOLD);

    // =======================================

    this.#update();
    this._valueObserve();
  }

  _valueObserve() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        this._values = [
          mutation.target.dataset.minValue,
          mutation.target.dataset.maxValue,
        ];
      });
      this.#update();

      document.dispatchEvent(
        new CustomEvent('set-pathogenicity-value-view', {
          detail: {
            dataset: this._dataset,
            values: this._values,
            threshold: this._switchThresholdObject(),
          },
        })
      );
    });

    this._tabPanels.forEach((panel) => {
      observer.observe(panel, {
        attributes: true,
      });
    });

    this._tabsList.addEventListener('click', (e) => {
      const tabButton = e.target.closest('ul[role="tablist"] > li > a.tab');
      if (!tabButton) return;
      this._dataset = tabButton.dataset.dataset;
      this._label = tabButton.textContent;
    });
  }

  _switchThresholdObject() {
    switch (this._dataset) {
      case 'alphamissense':
        return ALPHAMISSENSE_THRESHOLD;
      case 'sift':
        return SIFT_THRESHOLD;
      case 'polyphen':
        return POLYPHEN_THRESHOLD;
    }
  }

  _createRangeSlider(pathogenicity, pathogenicityThreshold) {
    const thisPanel = Array.from(this._tabPanels).find(
      (panel) => panel.id === pathogenicity
    );
    const rangeSliderEl = document.createElement('pathogenicity-range-slider');
    rangeSliderEl.pathogenicityThreshold = pathogenicityThreshold;
    rangeSliderEl.addEventListener('set-value', (e) => {
      thisPanel.setAttribute('data-min-value', e.detail.minVal);
      thisPanel.setAttribute('data-max-value', e.detail.maxVal);
    });

    thisPanel.appendChild(rangeSliderEl);
  }

  // public methods
  /** Retain value when changing to edit screen
   * See {@link ConditionValues} startToEditCondition */
  keepLastValues() {
    this._lastValue = this._valueViewEl.value || '';
    this._lastLabel = this._valueViewEl?.label || '';
  }

  /** If the cancel button is pressed when isFirstTime is false, restore the value before editing
   *  See {@link ConditionValues} _clickCancelButton */
  restore() {
    this._addValueView(this._lastValue, this._lastLabel, true);
  }

  /** Change whether okbutton can be pressed
   * @private */
  #update() {
    this._addValueView(this._dataset, this._label, true);
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

  get _valueViewEl() {
    return this._valuesElement.querySelector(
      ':scope > condition-item-value-view'
    );
  }
}

export default ConditionValueEditorPathogenicityPrediction;
