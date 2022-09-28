import { API_URL } from '../global.js';

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
  constructor(
    delegate,
    elm,
    placeholder,
    suggestDictionaries,
    queryURL = `${API_URL}/suggest?term=`
  ) {
    this._delegate = delegate;
    this._queryURL = queryURL;
    this._suggestDictionaries = suggestDictionaries;
    // make HTML
    elm.innerHTML = `
    <div class="search-field-view">
      <div class="fieldcontainer">
        <div class="field">
          <input type="text" title="${placeholder}" placeholder="${placeholder}">
          <button>Search</button>
        </div>
      </div>
      <div class="examples"></div>
      <div class="suggest-view"></div>
    </div>`;
    // reference
    const view = elm.querySelector(':scope > .search-field-view');
    const field = view.querySelector(':scope > .fieldcontainer > .field');
    this._field = field.querySelector(':scope > input[type="text"]');
    this._button = field.querySelector(':scope > button');
    this._examples = view.querySelector(':scope > .examples');
    this._suggestView = view.querySelector(':scope > .suggest-view');
    this._suggesting = false;
    // events
    this._field.addEventListener('keydown', this._keydown.bind(this));
    this._field.addEventListener('keyup', this._keyup.bind(this));
    this._field.addEventListener('blur', this._blur.bind(this));
    this._button.addEventListener('click', this._search.bind(this));
  }

  // private methods

  _keydown(e) {
    if (this._suggesting) {
      if (KEY_INCREMENT[e.code]) {
        let item = this._suggestView.querySelector(
          `.column:nth-child(${
            this.suggestPosition.x + 1
          }) > .list > .item:nth-child(${this.suggestPosition.y + 1})`
        );
        if (item) item.classList.remove('-selected');

        this._suggestPositionShift(KEY_INCREMENT[e.code]);
        item = this._suggestView.querySelector(
          `.column:nth-child(${
            this.suggestPosition.x + 1
          }) > .list > .item:nth-child(${this.suggestPosition.y + 1})`
        );
        item.classList.add('-selected');

        e.preventDefault();
        return false;
      }
    }
  }

  _keyup(e) {
    e.preventDefault();
    if (e.key === 'Enter') {
      if (
        this._suggesting &&
        this.suggestPosition.x !== -1 &&
        this.suggestPosition.y !== -1
      ) {
        this._field.value =
          this._suggestList[this.suggestPosition.x][this.suggestPosition.y]
            .alias_of ||
          this._suggestList[this.suggestPosition.x][this.suggestPosition.y]
            .term;
      }
      this._suggesting = false;
      this._suggestView.innerHTML = '';
      this._search();
    } else if (
      this._suggesting &&
      (e.key === 'Escape' || this._field.value.length < 3)
    ) {
      this._suggesting = false;
      this._suggestView.innerHTML = '';
      this.lastValue = '';
    } else if (
      this._field.value.length >= 3 &&
      this._field.value !== this.lastValue
    ) {
      fetch(`${this._queryURL}${this._field.value}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      })
        .then((response) => response.json())
        .then((json) => this._suggest(json));
    }
  }

  _blur() {
    setTimeout(() => {
      if (this._suggesting) {
        this._suggesting = false;
        this._suggestView.innerHTML = '';
        this.lastValue = '';
      }
    }, 250);
  }

  _suggestPositionShift(increment) {
    if (this.suggestPosition.x === -1 && this.suggestPosition.y === -1) {
      switch (true) {
        case increment.y === -1:
          this.suggestPosition = { x: 0, y: -1 };
          break;
        case increment.y === 1:
          this.suggestPosition = { x: 0, y: 0 };
          break;
        case increment.x === -1:
          this.suggestPosition = { x: 0, y: 0 };
          break;
        case increment.x === 1:
          this.suggestPosition = { x: -1, y: 0 };
          break;
      }
    } else {
      this.suggestPosition.x += increment.x;
      this.suggestPosition.y += increment.y;
    }

    switch (true) {
      case increment.y === -1:
        this.suggestPosition.y =
          this.suggestPosition.y < 0
            ? this._suggestList[0].length - 1
            : this.suggestPosition.y;
        break;
      case increment.y === 1:
        this.suggestPosition.y =
          this.suggestPosition.y >= this._suggestList[0].length
            ? 0
            : this.suggestPosition.y;
        break;
      case increment.x === -1:
        this.suggestPosition.x =
          this.suggestPosition.x < 0
            ? this._suggestList.length - 1
            : this.suggestPosition.x;
        break;
      case increment.x === 1:
        this.suggestPosition.x =
          this.suggestPosition.x >= this._suggestList.length
            ? 0
            : this.suggestPosition.x;
        break;
    }

    if (
      this._suggestList[this.suggestPosition.x][this.suggestPosition.y] ===
      undefined
    )
      this._suggestPositionShift(increment);
  }

  _search(term = this._field.value) {
    this._delegate.search(term);
  }

  _suggest(data) {
    this._suggesting = true;
    this.lastValue = this._field.value;
    this.suggestPosition = { x: -1, y: -1 };

    let max;

    const dictionaries = [];
    this._suggestList = [];

    // if we are querying for gene, API returns an object {gene:..., disease:...}, if searching disease, it returns an array [{id:..., label:..., highlight:...}, ...]
    if (!Array.isArray(data)) {
      max = Math.max(
        ...this._suggestDictionaries.map((key) => data[key].length)
      );
      max = max < NUMBER_OF_SUGGESTS ? max : NUMBER_OF_SUGGESTS;

      Object.keys(data).forEach((key, index) => {
        if (this._suggestDictionaries.indexOf(key) !== -1) {
          if (data[key].length > 0) {
            dictionaries.push(key);
            const column = [];
            for (let i = 0; i < max; i++) {
              column.push(data[key][i]);
            }
            this._suggestList[index] = column;
          }
        }
      });

      this._suggestView.innerHTML = dictionaries
        .map((key, index) => {
          const column = this._suggestList[index];
          return `
      <div class="column">
        <h3 class="title">${SUGGEST_LABELS[key]}</h3>
        <ul class="list">
          ${column
            .map((item) => {
              return `<li class="item${
                item === undefined ? ' -disabled' : ''
              }" data-value="${item ? item.term : ''}" data-alias="${
                item && item.alias_of ? item.alias_of : ''
              }">
              ${
                item
                  ? `${
                      `<span class="main">${
                        item.alias_of ? item.alias_of : item.term
                      }</span>` +
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
            $(item).on('click', (e) => {
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
      max = data.length;
      this._suggestList = data;
      this._suggestView.innerHTML = `
      <div class="column">
        <h3 class="title">Disease</h3>
      </div>
      `;
      const ul = document.createElement('ul');
      ul.className = 'list';
      if (max !== 0) {
        data.map((item) => {
          const li = document.createElement('li');
          li.className = 'item';
          li.dataset.id = item.id;
          li.innerHTML = item.highlight;
          ul.appendChild(li);
        });
        ul.addEventListener('click', (e) => {
          e.stopPropagation();
          if (e.target && e.target.dataset.id) {
            this._field.value = e.target.dataset.id;
            this._suggesting = false;
            this._suggestView.innerHTML = '';
            this._search();
          }
        });
      } else {
        ul.innerHTML = `<li class="item -disabled">No results found</li>`;
      }
      this._suggestView.querySelector('.column').appendChild(ul);
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
    return this._field.value;
  }
}
