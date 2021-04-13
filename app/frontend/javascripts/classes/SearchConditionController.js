import StoreManager from "./StoreManager.js";
import {API_URL} from "../global.js";

const NUMBER_OF_SUGGESTS = 10; // TODO: Config
const SUGGEST_LABELS = {
  gene: 'Gene symbol',
  disease: 'Disease name'
}
const KEY_INCREMENT = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }
};

export default class SearchConditionController {

  constructor(elm) {
    // reference
    this.elm = elm;
    this.field = elm.querySelector('#search-field');
    this.button = elm.querySelector('.search-form-ivew > .searchform > .searchbutton');
    this.suggestView = elm.querySelector('.suggest-view');
    this.suggesting = false;
    // events
    StoreManager.bind('searchConditions', this);
    this.field.addEventListener('keydown', this.keydown.bind(this));
    this.field.addEventListener('keyup', this.keyup.bind(this));
    this.field.addEventListener('blur', this.blur.bind(this));
    this.button.addEventListener('click', this.search.bind(this));
    this.elm.querySelectorAll('.searchexamples').forEach(dl => {
      dl.addEventListener('click', e => {
        e.stopPropagation();
        this.field.value = dl.querySelector('dd').textContent;
        this.button.dispatchEvent(new Event('click'));
      }, true);
    });
    // value
    const term = StoreManager.getSearchCondition('term');
    if (term) this.field.value = term;
  }

  keydown(e) {
    if (this.suggesting) {
      if (KEY_INCREMENT[e.code]) {
        let item = this.suggestView.querySelector(`.column:nth-child(${this.suggestPosition.x + 1}) > .list > .item:nth-child(${this.suggestPosition.y + 1})`);
        if (item) item.classList.remove('-selected');

        this.suggestPositionShift(KEY_INCREMENT[e.code]);
        item = this.suggestView.querySelector(`.column:nth-child(${this.suggestPosition.x + 1}) > .list > .item:nth-child(${this.suggestPosition.y + 1})`);
        item.classList.add('-selected');

        e.preventDefault();
        return false;
      }
    }
  }

  keyup(e) {
    e.preventDefault();
    if (e.key === 'Enter') {
      if (this.suggesting && this.suggestPosition.x !== -1 && this.suggestPosition.y !== -1) {
        this.field.value = this.suggestList[this.suggestPosition.x][this.suggestPosition.y].alias_of ||
          this.suggestList[this.suggestPosition.x][this.suggestPosition.y].term;
      }
      this.suggesting = false;
      this.suggestView.innerHTML = '';
      this.search();
    } else if (
      this.suggesting &&
      (
        e.key === 'Escape' ||
        this.field.value.length < 3
      )
    ) {
      this.suggesting = false;
      this.suggestView.innerHTML = '';
      this.lastValue = '';
    } else if (this.field.value.length >= 3 && this.field.value !== this.lastValue) {
      fetch(`${API_URL}/suggest?term=${this.field.value}`)
        .then(response => response.json())
        .then(json => this.suggest(json));
    }
  }

  blur() {
    setTimeout(() => {
      if (this.suggesting) {
        this.suggesting = false;
        this.suggestView.innerHTML = '';
        this.lastValue = '';
      }
    }, 250);
  }

  suggestPositionElement() {
    return this.suggestView.querySelector(`.column:nth-child(${this.suggestPosition.x + 1}) > .list > .item:nth-child(${this.suggestPosition.y + 1})`);
  }

  suggestPositionShift(increment) {
    if (this.suggestPosition.x === -1 && this.suggestPosition.y === -1) {
      switch(true) {
        case increment.y === -1:
          this.suggestPosition = {x: 0, y: -1};
          break;
        case increment.y === 1:
          this.suggestPosition = {x: 0, y: 0};
          break;
        case increment.x === -1:
          this.suggestPosition = {x: 0, y: 0};
          break;
        case increment.x === 1:
          this.suggestPosition = {x: -1, y: 0};
          break;
      }
    } else {
      this.suggestPosition.x += increment.x;
      this.suggestPosition.y += increment.y;
    }

    switch (true) {
      case increment.y === -1:
        this.suggestPosition.y = this.suggestPosition.y < 0 ? this.suggestList[0].length - 1 : this.suggestPosition.y;
        break;
      case increment.y === 1:
        this.suggestPosition.y = this.suggestPosition.y >= this.suggestList[0].length ? 0 : this.suggestPosition.y;
        break;
      case increment.x === -1:
        this.suggestPosition.x = this.suggestPosition.x < 0 ? this.suggestList.length - 1 : this.suggestPosition.x;
        break;
      case increment.x === 1:
        this.suggestPosition.x = this.suggestPosition.x >= this.suggestList.length ? 0 : this.suggestPosition.x;
        break;
    }

    if (this.suggestList[this.suggestPosition.x][this.suggestPosition.y] === undefined) this.suggestPositionShift(increment);
  }

  search() {
    StoreManager.setSearchCondition('term', this.field.value);
  }

  searchConditions(searchConditions) {
    if (searchConditions.term) {
      this.field.value = searchConditions.term;
    }
  }

  suggest(data) {
    this.suggesting = true;
    this.lastValue = this.field.value;
    this.suggestPosition = { x: -1, y: -1 };

    let max = Math.max(...Object.keys(data).map(key => data[key].length));
    max = max < NUMBER_OF_SUGGESTS ? max : NUMBER_OF_SUGGESTS;

    this.suggestList = [];
    const columnTypes = [];
    for (const key in data) {
      const column = [];
      if (data[key].length > 0) {
        for (let i = 0; i < max; i++) {
          column.push(data[key][i]);
        }
        this.suggestList.push(column);
        columnTypes.push(key);
      }
    }

    let html = '';
    for (let i = 0; i < this.suggestList.length; i++) {
      const column = this.suggestList[i];
      html += `<div class="column"><h3 class="title">${SUGGEST_LABELS[columnTypes[i]]}</h3><ul class="list">`;
      for (const item of column) {
        html += `
        <li class="item${item === undefined ? ' -disabled' : ''}" data-value="${item ? item.term : ''}" data-alias="${item && item.alias_of ? item.alias_of : ''}">
          ${item ? `${
            `<span class="main">${item.alias_of ? item.alias_of : item.term}</span>` + (item.alias_of ? `<span class="sub">alias: ${item.term}</span>` : '')
          }` : ''}
        </li>
        `;
      }
      html += '</ul></div>';
    }

    this.suggestView.innerHTML = html;

    this.suggestView.querySelectorAll('.column > .list > .item').forEach(item => {
      if (!item.classList.contains('-disabled')) {
        $(item).on('click', e => {
          e.stopPropagation();
          this.field.value = e.currentTarget.dataset.alias || e.currentTarget.dataset.value;
          this.suggesting = false;
          this.suggestView.innerHTML = '';
          this.search();
        });
      }
    });
  }
}
