import StoreManager from "./StoreManager.js";
import SearchFieldView from "./SearchFieldView.js";
// import {API_URL} from "../global.js";


export default class SearchConditionController {

  constructor(elm) {
    console.log(elm)

    this._searchFieldView = new SearchFieldView(elm);

    // reference
    // this.elm = elm;
    // this.field = elm.querySelector('#search-field');
    // this.button = elm.querySelector('.search-field-ivew > .searchform > .searchbutton');
    // this.suggestView = elm.querySelector('.suggest-view');
    // this.suggesting = false;
    // events
    StoreManager.bind('searchConditions', this);
    // this.field.addEventListener('keydown', this.keydown.bind(this));
    // this.field.addEventListener('keyup', this.keyup.bind(this));
    // this.field.addEventListener('blur', this.blur.bind(this));
    // this.button.addEventListener('click', this.search.bind(this));
    this.elm.querySelectorAll('.searchexamples').forEach(dl => {
      dl.addEventListener('click', e => {
        e.stopPropagation();
        this.field.value = dl.querySelector('dd').textContent;
        this.button.dispatchEvent(new Event('click'));
      }, true);
    });
    // value
    const term = StoreManager.getSearchCondition('term');
    // if (term) this.field.value = term;
  }

  // suggestPositionElement() {
  //   return this.suggestView.querySelector(`.column:nth-child(${this.suggestPosition.x + 1}) > .list > .item:nth-child(${this.suggestPosition.y + 1})`);
  // }


  search() {
    StoreManager.setSearchCondition('term', this.field.value);
  }

  searchConditions(searchConditions) {
    if (searchConditions.term) {
      this.field.value = searchConditions.term;
    }
  }

}
