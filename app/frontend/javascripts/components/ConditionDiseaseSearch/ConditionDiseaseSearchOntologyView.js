import { LitElement, css, html } from 'lit';

const DISEASE_ADVANCED_SEARCH_URL = `https://togovar-stg.biosciencedbc.jp/api/inspect/disease?node=`;

export default class CondDiseaseOntologyView extends LitElement {
  static get properties() {
    return {
      diseaseId: {
        type: String,
        attribute: 'disease-id',
      },
      data: { type: Object, state: true },
      loading: { type: Boolean, state: false },
      error: { type: Boolean, state: false },
    };
  }

  _fetchData(id) {
    console.log('fetching data with ', id);
    const url = DISEASE_ADVANCED_SEARCH_URL + id;

    this.loading = true;
    fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })
      .then((res) => res.json())
      .then((json) => {
        this.data = json;
      })
      .catch((err) => {
        this.error = true;
      })
      .finally(() => {
        this.loading = false;
      });

    this.requestUpdate();
  }

  set diseaseId(id) {
    this._fetchData(id);
    return true;
  }

  keepLastValues() {
    return;
  }

  constructor() {
    super(arguments);
    //declare reactive properties
    this.diseaseId = '';
    this.loading = false;
    this.error = false;
    this.data = null;
  }

  render() {
    return html`
      <div class="search-field-view">
        <h2>Advanced Search</h2>
        ${!this.data || this.loading
          ? html`<div>Loading...</div>`
          : html`<div class="search-field-view-content">
              ${this.data.label}
            </div>`}
      </div>
    `;
  }

  _createElement() {
    console.log('createElement');
  }

  // do not create shadow dom
  createRenderRoot() {
    return this;
  }
}

customElements.define(
  'condition-disease-ontology-view',
  CondDiseaseOntologyView
);
