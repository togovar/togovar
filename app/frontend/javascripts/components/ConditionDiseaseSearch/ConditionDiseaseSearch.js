import { LitElement, html, nothing } from 'lit';

import './ConditionDiseaseSearchOntologyView.js';
import './ConditionDiseaseSearchTextSearch.js';

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

  render() {
    return html`
      <condition-disease-text-search
        @new-suggestion-selected=${this._changeDiseaseEventHadnler}
      ></condition-disease-text-search>
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
