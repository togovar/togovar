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
    this.data = [];
  }

  keepLastValues() {}
  newSuggestionSelected(e) {
    this.diseaseId = e.detail.suggestion.id;
    this.requestUpdate();
  }

  render() {
    return html`
      <condition-disease-text-search
        @new-suggestion-selected=${this.newSuggestionSelected}
      ></condition-disease-text-search>
      <condition-disease-ontology-view
        disease-id="${this.diseaseId}"
      ></condition-disease-ontology-view>
    `;
  }

  // do not create shadow dom
  createRenderRoot() {
    return this;
  }
}

customElements.define('condition-disease-search', ConditionDiseaseSearch);
