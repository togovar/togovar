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

export default class SearchFieldView {

  constructor(delegate, elm, suggestDictionaries) {

    this._delegate = delegate;
    // reference
    const field = elm.querySelector(':scope > .fieldcontainer > .field');
    this._field = field.querySelector(':scope > input[type="text"]');
    const button = field.querySelector(':scope > .searchbutton');
    this._suggestView = elm.querySelector(':scope > .suggest-view');
    this._suggesting = false;
    // events
    this._field.addEventListener('keydown', this._keydown.bind(this));
    this._field.addEventListener('keyup', this._keyup.bind(this));
    this._field.addEventListener('blur', this._blur.bind(this));
    button.addEventListener('click', this._search.bind(this));
    // elm.querySelectorAll('.searchexamples').forEach(dl => {
    //   dl.addEventListener('click', e => {
    //     e.stopPropagation();
    //     this._field.value = dl.querySelector('dd').textContent;
    //     button.dispatchEvent(new Event('click'));
    //   }, true);
    // });
    // value
    // const term = StoreManager.getSearchCondition('term');
    // if (term) this._field.value = term;    
  }

  // private methods

  _keydown(e) {
    if (this._suggesting) {
      if (KEY_INCREMENT[e.code]) {
        let item = this._suggestView.querySelector(`.column:nth-child(${this.suggestPosition.x + 1}) > .list > .item:nth-child(${this.suggestPosition.y + 1})`);
        if (item) item.classList.remove('-selected');

        this._suggestPositionShift(KEY_INCREMENT[e.code]);
        item = this._suggestView.querySelector(`.column:nth-child(${this.suggestPosition.x + 1}) > .list > .item:nth-child(${this.suggestPosition.y + 1})`);
        item.classList.add('-selected');

        e.preventDefault();
        return false;
      }
    }
  }

  _keyup(e) {
    e.preventDefault();
    if (e.key === 'Enter') {
      if (this._suggesting && this.suggestPosition.x !== -1 && this.suggestPosition.y !== -1) {
        this._field.value = this.suggestList[this.suggestPosition.x][this.suggestPosition.y].alias_of ||
          this.suggestList[this.suggestPosition.x][this.suggestPosition.y].term;
      }
      this._suggesting = false;
      this._suggestView.innerHTML = '';
      this._search();
    } else if (
      this._suggesting &&
      (
        e.key === 'Escape' ||
        this._field.value.length < 3
      )
    ) {
      this._suggesting = false;
      this._suggestView.innerHTML = '';
      this.lastValue = '';
    } else if (this._field.value.length >= 3 && this._field.value !== this.lastValue) {
      fetch(`${API_URL}/suggest?term=${this._field.value}`)
        .then(response => response.json())
        .then(json => this._suggest(json));
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

    if (this.suggestList[this.suggestPosition.x][this.suggestPosition.y] === undefined) this._suggestPositionShift(increment);
  }

  _search() {
    this._delegate.search(this._field.value)
  }

  _suggest(data) {
    this._suggesting = true;
    this.lastValue = this._field.value;
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

    this._suggestView.innerHTML = html;

    this._suggestView.querySelectorAll('.column > .list > .item').forEach(item => {
      if (!item.classList.contains('-disabled')) {
        $(item).on('click', e => {
          e.stopPropagation();
          this._field.value = e.currentTarget.dataset.alias || e.currentTarget.dataset.value;
          this._suggesting = false;
          this._suggestView.innerHTML = '';
          this._search();
        });
      }
    });
  }


  // public method

  setTerm(term) {
    console.log(term);
  }

}