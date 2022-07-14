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

    .cards-container {
      max-height: 400px;
      overflow-y: auto;
      display: flex;
      gap: 7px;
      flex-direction: column;
      justify-content: start;
      align-items: center;
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

  shouldUpdate(changed) {
    if (Array.from(changed.keys()).includes('data') && changed.get('data')) {
      const changedData = changed.get('data');
      console.log('changedData', changedData);
      console.log(this.querySelector(`#${changedData.id}`));
    }
    return true;
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
        ${!this.data || !Object.keys(this.data).length
          ? (this.loading && html`<div>Loading...</div>`) ||
            (this.error && html`<div>Error</div>`)
          : html`<div class="search-field-view-content">
              <div class="cards-container">
                ${this.data.parents.map(
                  (parent) =>
                    html`
                      <ontology-card
                        id="${parent.id}"
                        .data=${parent}
                        @card_selected=${(e) => this._fetchData(e.detail.id)}
                      />
                    `
                )}
              </div>
              <div class="cards-container main">
                <ontology-card
                  id="${this.data.id}"
                  .data=${this.data}
                  selected
                />
              </div>
              <div class="cards-container">
                ${this.data.children.map(
                  (child) =>
                    html`
                      <ontology-card
                        .data=${child}
                        id="${child.id}"
                        @card_selected=${(e) => this._fetchData(e.detail.id)}
                      />
                    `
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
