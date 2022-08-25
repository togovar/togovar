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

  keepLastValues() {}
  newSuggestionSelected(e) {
    this.diseaseId = e.detail.suggestion.id;

    this.requestUpdate();
  }

  /**
   *
   * @param {string} value
   * @param {string} label
   * @param {boolean} isOnly
   */
  _addValueView(value, label, isOnly = false) {
    // find value view
    const selector = isOnly ? '' : `[data-value="${value}"]`;
    let valueView = this._valuesElement.querySelector(
      `condition-item-value-view${selector}`
    );
    // if no view is found, create a new one
    if (!valueView) {
      valueView = document.createElement('condition-item-value-view');
      valueView.conditionType = this._conditionType;
      this._valuesElement.append(valueView);
    }
    valueView.label = label;
    valueView.value = value;
    return valueView;
  }

  /**
   *
   * @param {string} value
   */
  _removeValueView(value) {
    const selector = value ? `[data-value="${value}"]` : '';
    const valueView = this._valuesElement.querySelector(
      `condition-item-value-view${selector}`
    );
    if (valueView) {
      valueView.remove();
    }
  }

  render() {
    return html`
      <condition-disease-text-search
        @new-suggestion-selected=${this.newSuggestionSelected}
      ></condition-disease-text-search>
      <condition-disease-ontology-view
        ._id="${this.diseaseId}"
      ></condition-disease-ontology-view>
    `;
  }

  // do not create shadow dom
  createRenderRoot() {
    return this;
  }
}

customElements.define('condition-disease-search', ConditionDiseaseSearch);
