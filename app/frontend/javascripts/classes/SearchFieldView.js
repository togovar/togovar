import { CONDITION_TYPE } from '../definition.js';

import '../components/Common/SearchField/SearchFieldWithSuggestions.js';

// TODO this whole component except for examples can be replaced with SearchFieldWithSuggestions (?)
const NUMBER_OF_SUGGESTS = 10; // TODO: Config
const SUGGEST_LABELS = {
  gene: 'Gene symbol',
  disease: 'Disease name',
};

const KEY_INCREMENT = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

export default class SearchFieldView {
  /**
   * @param {Object} _delegate - SimpleSearchView or ConditionValueEditorTextField Object
   * @param {Element} _elm - Parent element of the search-field-view
   * @param {String} _placeholder
   * @param {Array} _suggestDictionaries - ['gene', 'disease']
   * @param {URL} _queryURL - API
   * @param {String | Undefined} _conditionType - 'gene' or 'disease' or undefined
   */
  constructor(
    _delegate,
    _elm,
    _placeholder,
    _suggestDictionaries,
    _queryURL,
    _conditionType
  ) {
    this._delegate = _delegate;
    this._queryURL = _queryURL;
    this._suggestDictionaries = _suggestDictionaries;
    this._conditionType = _conditionType;

    this._suggesting = false;
    this._isSimpleSearch = true;

    // make HTML
    _elm.innerHTML = `
    <div class="search-field-view">
      <div class="fieldcontainer">
        <div class="field">
          <input type="text" title="${_placeholder}" placeholder="${_placeholder}">
          <button>Search</button>
          <search-field-with-suggestions placeholder="${_placeholder}"></search-field-with-suggestions>
        </div>
      </div>
      <div class="examples"></div>
      <div class="suggest-view"></div>
    </div>`;

    // reference
    const view = _elm.querySelector(':scope > .search-field-view');
    const field = view.querySelector(':scope > .fieldcontainer > .field');
    this._field = field.querySelector(':scope > input[type="text"]');
    this._button = field.querySelector(':scope > button');
    this._examples = view.querySelector(':scope > .examples');
    this._suggestView = view.querySelector(':scope > .suggest-view');

    // events
    this._field.addEventListener('keydown', this._itemSelect.bind(this));
    this._field.addEventListener(
      'keyup',
      this._suggestDecisionAndShowHide.bind(this)
    );
    this._field.addEventListener('blur', this._focusIsNotArea.bind(this));
    this._button.addEventListener('click', this._search.bind(this));
  }

  // private methods

  _itemSelect(e) {
    if (this._suggesting && KEY_INCREMENT[e.code]) {
      this._suggestPositionShift(KEY_INCREMENT[e.code]);

      let item = this._suggestView.querySelector(
        `.column:nth-child(${this._suggestPosition.x + 1})
        > .list
        > .item:nth-child(${this._suggestPosition.y + 1})`
      );

      if (item)
        this._suggestView
          .querySelectorAll('.column>.list .item')
          .forEach((item) => item.classList.remove('-selected'));
      item.classList.add('-selected');

      e.preventDefault();
    }
  }

  _suggestDecisionAndShowHide(e) {
    const decisionSuggest = e.key === 'Enter' && this._suggestPosition.y !== -1;
    const fieldValueIsEmpty = this._field.value === '';
    const hideSuggest =
      this._suggesting && (e.key === 'Escape' || this._field.value.length < 3);
    const showSuggest =
      this._field.value.length >= 3 &&
      this._field.value !== this.lastValue &&
      this._conditionType !== CONDITION_TYPE.variant_id;

    switch (true) {
      case decisionSuggest:
        return this._suggestDecision();
      case fieldValueIsEmpty:
        return this._search();
      case hideSuggest:
        return this._suggestHide();
      case showSuggest:
        return this._suggestShow();
    }
  }

  _suggestDecision() {
    const selectWithCursor =
      this._suggesting &&
      this._suggestPosition.x !== -1 &&
      this._suggestPosition.y !== -1;

    if (selectWithCursor) {
      if (this._isSimpleSearch) {
        this._field.value =
          this._suggestList[this._suggestPosition.x][this._suggestPosition.y]
            .alias_of ||
          this._suggestList[this._suggestPosition.x][this._suggestPosition.y]
            .term;
      } else {
        this._field.value = this._suggestList[this._suggestPosition.y].symbol;
        this._field.dataset.value =
          this._suggestList[this._suggestPosition.y].id;
      }
    }

    if (this._conditionType === CONDITION_TYPE.variant_id) {
      this._field.dataset.value = this._field.value;
    }

    this._suggesting = false;
    this._suggestView.innerHTML = '';
    this._search();
  }

  _suggestHide() {
    this._suggesting = false;
    this._suggestView.innerHTML = '';
    this.lastValue = '';
  }

  async _suggestShow() {
    try {
      const response = await fetch(`${this._queryURL}${this._field.value}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
      const json = await response.json();
      this._createSuggestList(json);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  _focusIsNotArea() {
    setTimeout(() => {
      if (this._suggesting) {
        this._suggesting = false;
        this._suggestView.innerHTML = '';
        this.lastValue = '';
      }
    }, 250);
  }

  _suggestPositionShift(incrementOfXY) {
    this._initializeAndChangeSuggestPosition(incrementOfXY);
    this._changeSuggestPositionOnReturn();
  }

  _initializeAndChangeSuggestPosition(incrementOfXY) {
    if (this._suggestPosition.x === -1 && this._suggestPosition.y === -1) {
      switch (true) {
        case KEY_INCREMENT.ArrowUp.y === incrementOfXY.y:
          return (this._suggestPosition = { x: 0, y: -1 });
        case KEY_INCREMENT.ArrowDown.y === incrementOfXY.y:
          return (this._suggestPosition = { x: 0, y: 0 });
        case KEY_INCREMENT.ArrowLeft.x === incrementOfXY.x:
          return (this._suggestPosition = { x: 0, y: 0 });
        case KEY_INCREMENT.ArrowRight.x === incrementOfXY.x:
          return (this._suggestPosition = { x: -1, y: 0 });
      }
    } else {
      this._suggestPosition.x += incrementOfXY.x;
      this._suggestPosition.y += incrementOfXY.y;
    }
  }

  _changeSuggestPositionOnReturn() {
    let lengthY, lengthX;
    if (this._isSimpleSearch && this._suggestList.length) {
      lengthY = this._suggestList[0].length;
      lengthX = this._suggestList.length;
    } else {
      lengthY = this._suggestList.length;
      lengthX = 1;
    }
    switch (true) {
      case this._suggestPosition.y < 0:
        return (this._suggestPosition.y = lengthY - 1);
      case this._suggestPosition.y >= lengthY:
        return (this._suggestPosition.y = 0);
      case this._suggestPosition.x < 0:
        return (this._suggestPosition.x = lengthX - 1);
      case this._suggestPosition.x >= lengthX:
        return (this._suggestPosition.x = 0);
    }
  }

  _search() {
    this._delegate.search();
  }

  _createSuggestList(data) {
    this._suggesting = true;
    this.lastValue = this._field.value;
    this._suggestPosition = { x: -1, y: -1 };
    this._dictionaries = [];
    this._suggestList = [];
    this._isSimpleSearch = !Array.isArray(data);

    // if we are querying with simple search, API returns an object {gene:..., disease:...}
    // if searching disease / gene, it returns an array[{ id:..., label:..., highlight:...}, ...]
    if (this._isSimpleSearch) {
      this._suggestData(data);

      this._suggestView.innerHTML = this._dictionaries
        .map((key, index) => {
          const column = this._suggestList[index];
          return `
      <div class="column">
        <h3 class="title">${SUGGEST_LABELS[key]}</h3>
        <ul class="list">
          ${column
            .map((item) => {
              return `
              <li class="item${item === undefined ? ' -disabled' : ''}"
                data-value="${item ? item.term : ''}"
                data-alias="${item && item.alias_of ? item.alias_of : ''}">
                ${
                  item
                    ? `${
                        `<span class="main">${
                          item.alias_of ? item.alias_of : item.term
                        }</span >` +
                        (item.alias_of
                          ? `<span class="sub">alias: ${item.term}</span>`
                          : '')
                      }`
                    : ''
                }
              </li>`;
            })
            .join('')}
        </ul>
      </div>`;
        })
        .join('');

      this._suggestView
        .querySelectorAll('.column > .list > .item')
        .forEach((item) => {
          if (!item.classList.contains('-disabled')) {
            item.addEventListener('click', (e) => {
              e.stopPropagation();
              this._field.value =
                e.currentTarget.dataset.alias || e.currentTarget.dataset.value;
              this._suggesting = false;
              this._suggestView.innerHTML = '';
              this._search();
            });
          }
        });
    } else {
      //for Advanced search of gene & disease
      this._suggestData(data);

      this._suggestView.innerHTML = `<div class="column"></div>`;
      const ul = document.createElement('ul');
      ul.className = 'list';

      if (this._suggestLength(data) !== 0) {
        for (let i = 0; i < this._suggestLength(data); i++) {
          const item = data[i];
          const li = document.createElement('li');
          li.className = 'item';
          li.dataset.value = item.id;
          li.dataset.label =
            this._conditionType === CONDITION_TYPE.gene_symbol
              ? item.symbol
              : item.id;
          li.innerHTML = item.highlight;

          if (item.alias_of) {
            const spanSub = document.createElement('span');
            spanSub.className = 'sub';
            spanSub.textContent = item.alias_of;
            li.append(spanSub);
          }
          ul.appendChild(li);
        }

        ul.addEventListener('click', (e) => {
          this._field.value =
            e.target.dataset.label || e.target.parentElement.dataset.label; // text field value, i.e. "label"
          this._field.dataset.value =
            e.target.dataset.value || e.target.parentElement.dataset.value; // text dataset value for query, i.e. "value"
          this._suggesting = false;
          this._suggestView.innerHTML = '';
          this._search();
        });
      } else {
        ul.innerHTML = `<li class="item -disabled">No results found</li>`;
      }
      this._suggestView.querySelector('.column').appendChild(ul);
    }
  }

  _suggestLength(data) {
    if (this._isSimpleSearch) {
      const maxLengthOfContent = Math.max(
        ...this._suggestDictionaries.map((key) => data[key].length)
      );
      return Math.min(maxLengthOfContent, NUMBER_OF_SUGGESTS);
    } else {
      return Math.min(data.length, NUMBER_OF_SUGGESTS);
    }
  }

  _suggestData(data) {
    if (this._isSimpleSearch) {
      Object.keys(data).forEach((key, index) => {
        if (data[key].length > 0) {
          this._dictionaries.push(key);
          const column = [];
          for (let i = 0; i < this._suggestLength(data); i++) {
            column.push(data[key][i]);
          }
          this._suggestList[index] = column;
        }
      });
    } else {
      this._suggestList = data.slice(0, this._suggestLength(data));
    }
  }

  // public method

  setExamples(examples) {
    this._examples.innerHTML = examples
      .map(
        (example) => `<dl><dt>${example.key}</dt><dd>${example.value}</dd></dl>`
      )
      .join('');
    return this._examples.querySelectorAll('dl');
  }

  setTerm(term, excute = false) {
    this._field.value = term;
    if (excute) this._button.dispatchEvent(new Event('click'));
  }

  get value() {
    return this._field.dataset.value;
  }

  get label() {
    return this._field.value;
  }
}
