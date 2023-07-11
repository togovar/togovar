import StoreManager from './StoreManager.js';
// import SearchFieldView from './SearchFieldView.js';
import { API_URL } from '../global.js';
import SimpleSearch from '../components/Common/SearchField/SimpleSearch.js';

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

// TODO here!!! not in the SearchFieldView!
export default class SimpleSearchView {
  constructor() {
    const elm = document.getElementById('SimpleSearchView');

    this._searchFieldView = new SimpleSearch(
      elm,
      `${API_URL}/suggest`,
      'Search for disease or gene symbol or rs...',
      EXAMPLES
    );

    // events
    StoreManager.bind('simpleSearchConditions', this);
    // value
    const term = StoreManager.getSimpleSearchCondition('term');
    if (term) this._searchFieldView.setTerm(term);
  }

  search() {
    StoreManager.setSimpleSearchCondition('term', this._searchFieldView.label);
  }

  simpleSearchConditions(conditions) {
    if (conditions.term) {
      this._searchFieldView.setTerm(conditions.term);
    }
  }
}
