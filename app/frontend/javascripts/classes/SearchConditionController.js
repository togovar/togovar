import StoreManager from "./StoreManager.js";
import SearchFieldView from "./SearchFieldView.js";
// import {API_URL} from "../global.js";

const EXAMPLES = [
  {
    key: 'Disease',
    value: 'Breast-ovarian cancer, familial 2'
  },
  {
    key: 'Gene',
    value: 'ALDH2'
  },
  {
    key: 'refSNP',
    value: 'rs114202595'
  },
  {
    key: 'TogoVar',
    value: 'tgv421843'
  },
  {
    key: 'Position(GRCh37/hg19)',
    value: '16:48258198'
  },
  {
    key: 'Region(GRCh37/hg19)',
    value: '10:73270743-73376976'
  }
]

export default class SearchConditionController {

  constructor() {

    const elm = document.getElementById('SimpleSearchView');
    this._searchFieldView = new SearchFieldView(
      this,
      elm,
      'Search for disease or gene symbol or rs...',
      ['gene', 'disease']
    );

    // events
    StoreManager.bind('searchConditions', this);
    // value
    const term = StoreManager.getSearchCondition('term');
    if (term) this._searchFieldView.setTerm(term);

    // examples
    this._searchFieldView.setExamples(EXAMPLES)
      .forEach(dl => {
        dl.addEventListener('click', e => {
          e.stopPropagation();
          this._searchFieldView.setTerm(dl.querySelector('dd').textContent, true);
        }, true);
      });

  }

  search(value) {
    StoreManager.setSearchCondition('term', value);
  }

  searchConditions(searchConditions) {
    if (searchConditions.term) {
      this._searchFieldView.setTerm(searchConditions.term);
    }
  }

}
