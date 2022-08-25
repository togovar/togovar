import { LitElement, html } from 'lit';

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
  }

  newSuggestionSelected(e) {
    this.diseaseId = e.detail.id;

    this._changeDiseaseEventHadnler(e);
    this.requestUpdate();
  }

  _changeDiseaseEventHadnler(e) {
    e.stopPropagation();
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

  render() {
    return html`
      <condition-disease-text-search
        @new-suggestion-selected=${this.newSuggestionSelected}
      ></condition-disease-text-search>
      <condition-disease-ontology-view
        ._id="${this.diseaseId}"
        @disease-selected="${this._changeDiseaseEventHadnler}"
      ></condition-disease-ontology-view>
    `;
  }

  // do not create shadow dom
  createRenderRoot() {
    return this;
  }
}

customElements.define('condition-disease-search', ConditionDiseaseSearch);
