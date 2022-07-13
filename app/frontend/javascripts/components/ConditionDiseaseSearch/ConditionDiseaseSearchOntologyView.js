import { LitElement, css, html } from 'lit';
import './OntologyCard';

const DISEASE_ADVANCED_SEARCH_URL = `https://togovar-stg.biosciencedbc.jp/api/inspect/disease?node=`;

export default class CondDiseaseOntologyView extends LitElement {
  static get properties() {
    return {
      diseaseId: {
        type: String,
        attribute: 'disease-id',
        reflect: true,
      },
      data: { type: Object, state: true },
      loading: { type: Boolean, state: true },
      error: { type: Boolean, state: true },
    };
  }

  static styles = css`
    .search-field-view {
      padding: 10px;
    }
    .search-field-view-content {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      height: 400px;
    }
    .search-field-view-content > div {
      max-height: 400px;
      overflow-y: auto;
    }
    .ontology-parents {
      width: 20rem;
      display: flex;
      flex-direction: column;
      justify-content: start;
      align-items: center;
    }
    .ontology-card {
      width: 20rem;
      display: flex;
      flex-direction: column;
      justify-content: start;
      align-items: center;
    }
    .parent {
      margin: 0.5em;
      width: 100%;
      text-align: center;
    }
  `;

  _fetchData(id) {
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
        ${!this.data || this.loading || !Object.keys(this.data).length
          ? html`<div>Loading...</div>`
          : html`<div class="search-field-view-content">
              <div class="ontology-parents">
                ${this.data.parents.map(
                  (parent) => html` <ontology-card .data=${parent} /> `
                )}
              </div>
              <div class="ontology-card">
                <ontology-card .data=${this.data} selected />
              </div>
              <div class="ontology-children">
                ${this.data.children.map(
                  (child) => html` <ontology-card .data=${child} /> `
                )}
              </div>
            </div>`}
      </div>
    `;
  }

  _createElement() {
    console.log('createElement');
  }

  // do not create shadow dom
  // createRenderRoot() {
  //   return this;
  // }
}

customElements.define(
  'condition-disease-ontology-view',
  CondDiseaseOntologyView
);
