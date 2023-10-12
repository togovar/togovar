import { LitElement, html, nothing } from 'lit';

import './ConditionDiseaseSearchOntologyView.js';
import '../Common/SearchField/SearchFieldWithSuggestions';

import { API_URL } from '../../global';

const suggestAPI = `${API_URL}/api/search/disease`;

export class ConditionDiseaseSearch extends LitElement {
  _timer = null;

  static get properties() {
    return {
      diseaseId: {
        type: String,
        reflect: true,
      },
      data: { state: true },
      loading: { type: Boolean, state: true },
    };
  }

  constructor(el) {
    super();
    el.appendChild(this);

    this._valuesElement = el.parentElement.querySelector(
      ':scope > .summary > .values'
    );

    this.data = [];
    this.diseaseId = 'MONDO_0000001';
    this.loading = false;
  }

  _changeDiseaseEventHadnler(e) {
    e.stopPropagation();
    this.diseaseId = e.detail.id;
    this.dispatchEvent(
      new CustomEvent('disease-selected', {
        detail: {
          id: e.detail.id,
          label: e.detail.label,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  _loadingStartedHandler(e) {
    e.stopPropagation();

    this._timer = setTimeout(() => {
      this.loading = true;
    }, 200);
  }

  _loadingEndedHandler(e) {
    e.stopPropagation();
    this.loading = false;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('id', 'ConditionDiseaseSearch');
  }

  render() {
    return html`
      <search-field-with-suggestions
        .suggestAPIURL="${suggestAPI}"
        .suggestAPIQueryParam="${'term'}"
        .options="${{ valueMappings: { valueKey: 'id', labelKey: 'label' } }}"
        placeholder="Breast-ovarian cancer, familial 2"
        @new-suggestion-selected="${this._changeDiseaseEventHadnler}"
      ></search-field-with-suggestions>

      <div class="container">
        ${this.loading
          ? html`<div class="loading">
              <span></span>
            </div>`
          : nothing}

        <condition-disease-ontology-view
          ._id="${this.diseaseId}"
          @disease-selected="${this._changeDiseaseEventHadnler}"
          @loading-started="${this._loadingStartedHandler}"
          @loading-ended="${this._loadingEndedHandler}"
        ></condition-disease-ontology-view>
      </div>
    `;
  }

  // do not create shadow dom
  createRenderRoot() {
    return this;
  }
}

customElements.define('condition-disease-search', ConditionDiseaseSearch);
