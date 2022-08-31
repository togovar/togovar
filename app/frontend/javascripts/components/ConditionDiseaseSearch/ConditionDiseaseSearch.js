import { LitElement, html, nothing } from 'lit';

import './ConditionDiseaseSearchOntologyView.js';
import './ConditionDiseaseSearchTextSearch.js';

export class ConditionDiseaseSearch extends LitElement {
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
    this.diseaseId = '';
    this.loading = false;
    this._timer = null;
  }

  _changeDiseaseEventHadnler(e) {
    e.stopPropagation();
    this.diseaseId = e.detail.id;
    this.dispatchEvent(
      new CustomEvent('disease-selected', {
        detail: {
          id: e.detail.id,
          label: e.detail.label,
          cui: e.detail.cui,
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
      <div class="container" style="position: relative;">
        ${this.loading
          ? html`
              <div
                class="loading"
                style="position: absolute; width:100%; height:100%; opacity: 0.5;"
              >
                <span>Loading...</span>
              </div>
            `
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
