import StoreManager from "./StoreManager.js";
import SearchFieldView from "./SearchFieldView.js";
// import {API_URL} from "../global.js";


export default class SearchConditionController {

  constructor() {

    const elm = document.getElementById('SimpleSearchView');
    this._searchFieldView = new SearchFieldView(
      this,
      elm,
      ['gene', 'disease']
    );

    // events
    StoreManager.bind('searchConditions', this);
    elm.querySelectorAll('.searchexamples').forEach(dl => {
      dl.addEventListener('click', e => {
        e.stopPropagation();
        this.field.value = dl.querySelector('dd').textContent;
        this.button.dispatchEvent(new Event('click'));
      }, true);
    });
    // value
    const term = StoreManager.getSearchCondition('term');
    if (term) this._searchFieldView.setTerm(term);
  }

  search(value) {
    console.log(value)
    StoreManager.setSearchCondition('term', value);
  }

  searchConditions(searchConditions) {
    if (searchConditions.term) {
      console.log(searchConditions.term)
      this._searchFieldView.setTerm(searchConditions.term);
    }
  }

}
