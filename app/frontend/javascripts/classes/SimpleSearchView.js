import StoreManager from './StoreManager.js';
import SearchFieldView from './SearchFieldView.js';
import { API_URL } from '../global.js';

const EXAMPLES = (() => {
  switch (TOGOVAR_FRONTEND_REFERENCE) {
    case 'GRCh37':
      return [
        {
          key: 'Disease',
          value: 'Breast-ovarian cancer, familial 2',
        },
        {
          key: 'Gene',
          value: 'ALDH2',
        },
        {
          key: 'refSNP',
          value: 'rs114202595',
        },
        {
          key: 'TogoVar',
          value: 'tgv421843',
        },
        {
          key: 'Position(GRCh37/hg19)',
          value: '16:48258198',
        },
        {
          key: 'Region(GRCh37/hg19)',
          value: '10:73270743-73376976',
        },
        {
          key: 'HGVSc',
          value: 'NM_000690:c.1510G>A',
        },
        {
          key: 'HGVSp',
          value: 'ALDH2:p.Glu504Lys',
        },
      ];
    case 'GRCh38':
      return [
        {
          key: 'Disease',
          value: 'Breast-ovarian cancer, familial 2',
        },
        {
          key: 'Gene',
          value: 'ALDH2',
        },
        {
          key: 'refSNP',
          value: 'rs114202595',
        },
        {
          key: 'TogoVar',
          value: 'tgv421843',
        },
        {
          key: 'Position(GRCh38)',
          value: '16:48224287',
        },
        {
          key: 'Region(GRCh38)',
          value: '10:71510986-71617219',
        },
        {
          key: 'HGVSc',
          value: 'NM_000690:c.1510G>A',
        },
        {
          key: 'HGVSp',
          value: 'ALDH2:p.Glu504Lys',
        },
      ];
    default:
      return [];
  }
})();

export default class SimpleSearchView {
  constructor() {
    const elm = document.getElementById('SimpleSearchView');
    this._searchFieldView = new SearchFieldView(
      this,
      elm,
      'Search for disease or gene symbol or rs...',
      ['gene', 'disease'],
      `${API_URL}/suggest?term=`
    );

    // events
    StoreManager.bind('simpleSearchConditions', this);
    // value
    const term = StoreManager.getSimpleSearchCondition('term');
    if (term) this._searchFieldView.setTerm(term);

    // examples
    this._searchFieldView.setExamples(EXAMPLES).forEach((dl) => {
      dl.addEventListener(
        'click',
        (e) => {
          e.stopPropagation();
          this._searchFieldView.setTerm(
            dl.querySelector('dd').textContent,
            true
          );
        },
        true
      );
    });
  }

  search() {
    const label = this._searchFieldView.label;
    StoreManager.setSimpleSearchCondition('term', label);
  }

  simpleSearchConditions(conditions) {
    if (conditions.term) {
      this._searchFieldView.setTerm(conditions.term);
    }
  }
}
