import StoreManager from "./StoreManager.js";
import SearchFieldView from "./SearchFieldView.js";

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
  },
  {
    key: 'HGVSc',
    value: 'NM_000690:c.1510G>A'
  },
  {
    key: 'HGVSp',
    value: 'ALDH2:p.Glu504Lys'
  }
]

export default class SimpleSearchView {

  constructor() {

    const elm = document.getElementById('SimpleSearchView');
    this._searchFieldView = new SearchFieldView(
      this,
      elm,
      'Search for disease or gene symbol or rs...',
      ['gene', 'disease']
    );

    // events
    StoreManager.bind('simpleSearchConditions', this);
    // value
    const term = StoreManager.getSimpleSearchCondition('term');
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
    StoreManager.setSimpleSearchCondition('term', value);
  }

  simpleSearchConditions(conditions) {
    if (conditions.term) {
      this._searchFieldView.setTerm(conditions.term);
    }
  }

}
