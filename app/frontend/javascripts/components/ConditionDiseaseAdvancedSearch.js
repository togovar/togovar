import { LitElement, css, html } from 'lit';

const DISEASE_ADVANCED_SEARCH_URL = `https://togovar-stg.biosciencedbc.jp/api/inspect/disease?node=`;

export class DiseaseAdvancedSearch extends LitElement {
  static get properties() {
    return {
      diseaseId: { type: String },
      data: { attribute: false },
    };
  }

  fetchData() {
    const url = DISEASE_ADVANCED_SEARCH_URL + this.diseaseId;

    fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })
      .then((resp) => resp.json())
      .then((json) => {
        console.log('fetching data', url);
        console.log('json', json);
        this.data = json;
      });
  }

  keepLastValues() {
    return;
  }

  constructor(el) {
    super(arguments);
    //declare reactive properties
    this.data = [];
    this.diseaseId = 'MONDO_0005709';
    el.appendChild(this);
  }

  connectedCallback() {
    super.connectedCallback();
    this.fetchData();
  }

  render() {
    if (!this.data || !this.diseaseId) {
      return html`<div>Loading...</div>`;
    }
    return html`
      <section>
        <h2>Advanced Search</h2>
        ${JSON.stringify(this.data)}
      </section>
    `;
  }

  _createElement() {
    console.log('createElement');
  }
  createRenderRoot() {
    return this;
  }
}

customElements.define('disease-advanced-search', DiseaseAdvancedSearch);
