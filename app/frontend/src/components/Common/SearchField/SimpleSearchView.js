import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import './SearchFieldWithSuggestions';
import './SearchFieldExamples';
import './SimpleSearchButton';
// import {storeManager} from '../../../store/StoreManager';
import {
  setSimpleSearchCondition,
  getSimpleSearchCondition,
} from '../../../store/searchManager';
import { storeManager } from '../../../store/StoreManager';
import { API_URL } from '../../../global.js';

import Styles from '../../../../stylesheets/object/component/simple-search-view.scss';

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
          value: 'tgv56616325',
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
          value: 'tgv56616325',
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

/** Class that displays simple search */
@customElement('simple-search-view')
class SimpleSearchView extends LitElement {
  static styles = [Styles];

  constructor() {
    super();
    document.getElementById('SimpleSearchView').appendChild(this);
  }

  /** @property {string} _value - value of suggestion */
  @state() _value;
  /** @property {string} _term - Input value */
  @state() _term = getSimpleSearchCondition('term');
  /** @property {boolean} _hideSuggestions - Whether to hide suggestions */
  @state() _hideSuggestions = true;

  /** Search using storeManager's setSimpleSearchCondition. And add regex about chromosome.
   * @private
   * @param {string} term - value to search for */
  _search(term) {
    const chromosomePattern = /([1-9]|1[0-9]|2[0-2]|X|Y|M|MT):\d+/i;

    if (chromosomePattern.test(term)) {
      term = term.replace(/Chr|ch|Cr|cs/i, '').toUpperCase();

      if (term.includes('M:')) {
        term = term.replace('M:', 'MT:');
      }
    }

    setSimpleSearchCondition('term', term);
  }

  /** When selected from suggest, hide suggest, put label in this._value, search by label
   * @private
   * @param {CustomEvent} e - new-suggestion-selected (SearchFieldtWithSuggestions) */
  _handleSuggestionEnter(e) {
    this._hideSuggestions = true;
    this._value = e.detail.label;
    this._term = e.detail.label;
    this._search(e.detail.label);
  }

  /** When selected from suggest, hide suggest, put EXAMPLE value in this._value, search by EXAMPLE value
   * @private
   * @param {CustomEvent} e - example-selected (SearchFieldExamples) */
  _handleExampleSelected(e) {
    this._hideSuggestions = true;
    this._value = e.detail.value;
    this._term = e.detail.value;
    this._search(e.detail.value);
  }

  /** Put input value in this._term
   * @private
   * @param {CustomEvent} e - input-term (SearchFieldWithSuggestions) */
  _inputTerm(e) {
    this._term = e.detail;
    // 入力されたテキストを検索条件に反映する（ただし検索は実行しない）
    const currentConditions = {
      ...storeManager.getData('simpleSearchConditions'),
    };
    // 空文字列も適切に処理
    currentConditions.term = this._term || '';
    storeManager.setData('simpleSearchConditions', currentConditions);
  }

  /** Search input value with Enter
   * @private */
  _handleTermEnter() {
    if (this._term === undefined) return;
    this._search(this._term);
  }

  /** Search input value with Search button
   * @private */
  _handleSeachButtonClick() {
    this._search(this._term || '');
  }

  /** リセットボタンが押されたときの処理 */
  _handleInputReset() {
    this._term = '';
    this._value = '';
    this._hideSuggestions = true;

    // 検索条件を更新して空の検索を実行
    setSimpleSearchCondition('term', '');
  }

  render() {
    return html`
      <div class="simple-search-container">
        <search-field-with-suggestions
          exportparts="input-field"
          .placeholder=${'Search for disease or gene symbol or rs...'}
          .suggestAPIURL=${`${API_URL}/suggest`}
          .suggestAPIQueryParam=${'term'}
          .options=${{
            valueMappings: {
              valueKey: 'term',
              labelKey: 'term',
              aliasOfKey: 'alias_of',
            },
            titleMappings: { gene: 'Gene names', disease: 'Disease names' },
          }}
          .term=${this._term}
          .hideSuggestions=${this._hideSuggestions}
          @new-suggestion-selected=${this._handleSuggestionEnter}
          @search-term-enter=${this._handleTermEnter}
          @input-term=${this._inputTerm}
          @input=${() => (this._hideSuggestions = false)}
          @input-reset=${this._handleInputReset}
        ></search-field-with-suggestions>

        <search-button @click=${this._handleSeachButtonClick}></search-button>
      </div>
      <search-field-examples
        .examples=${EXAMPLES}
        @example-selected=${this._handleExampleSelected}
      >
      </search-field-examples>
    `;
  }
}

export default SimpleSearchView;
