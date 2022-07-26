import { LitElement, css, html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import { flip } from './flip';

import './OntologyCard';

const DISEASE_ADVANCED_SEARCH_URL = `https://togovar-stg.biosciencedbc.jp/api/inspect/disease?node=`;

// const flip = directive((options = { duration: 300 }, onfinish) => (part) => {
//   const firstElement = part.committer.element;
//   // Don't animate first render
//   if (!firstElement.isConnected) {
//     return;
//   }
//   // Capture render position before update
//   const first = firstElement.getBoundingClientRect();
//   // Nodes may be re-used so identify via a key.
//   const container = firstElement.parentNode;
//   const key = firstElement.getAttribute('key');
//   requestAnimationFrame(() => {
//     // Find matching element.
//     const lastElement = container.querySelector(`[key="${key}"]`);
//     if (!lastElement) {
//       return;
//     }
//     // Capture render position after update
//     const last = lastElement.getBoundingClientRect();
//     // Calculate deltas and animate if something changed.
//     const topChange = first.top - last.top;
//     if (topChange !== 0) {
//       lastElement.animate(
//         [{ transform: `translate(${topChange}px, ${topChange}px)` }, {}],
//         options
//       ).onfinish = onfinish;
//     }
//   });
// });

export default class CondDiseaseOntologyView extends LitElement {
  static get properties() {
    return {
      diseaseId: {
        type: String,
        attribute: 'disease-id',
        reflect: true,
      },
      data: {
        type: Object,
        state: true,
      },
      children: {
        type: Array,
        state: true,
      },
      parents: {
        type: Object,
        state: true,
      },
      current: {
        type: Object,
        state: true,
      },
      loading: { type: Boolean, state: true },
      error: { type: Boolean, state: true },
    };
  }

  static styles = css`
    .search-field-view {
      padding: 10px;
    }
    .search-field-view-content {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      grid-gap: 1em;
      margin: 0 auto;
      position: relative;
      overflow: hidden;
    }

    .cards-container {
      position: relative;
      height: 400px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      gap: 7px;
    }

    ontology-card {
      display: block;
      position: relative;
    }
  `;

  constructor() {
    super(arguments);
    //declare reactive properties
    this.diseaseId = '';
    this.loading = false;
    this.error = false;
    this.data = null;
    this.current = {};
    this.children = {};
    this.parents = {};
  }

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
  }

  set diseaseId(id) {
    this._fetchData(id);
  }

  keepLastValues() {
    return;
  }

  render() {
    const options = {
      duration: 1000,
      timingFunction: 'ease-out', // 'steps(5, end)'
    };

    return html`
      <div class="search-field-view">
        <h2>Advanced Search</h2>
        ${!this.data || !Object.keys(this.data).length
          ? (this.loading && html`<div>Loading...</div>`) ||
            (this.error && html`<div>Error</div>`)
          : html`<div class="search-field-view-content">
              <div class="cards-container parents" id="parents">
                ${repeat(
                  this.data.parents,
                  (parent) => parent.id,
                  (parent) => {
                    return html`<ontology-card
                      key="${parent.id}"
                      id="${parent.id}"
                      ${flip({ id: parent.id, options })}
                      .data=${parent}
                      @card_selected=${(e) => this._fetchData(e.detail.id)}
                      selected
                    />`;
                  }
                )}
              </div>
              <div class="cards-container main" id="main">
                ${repeat(
                  [this.data],
                  (data) => data.id,
                  (data) => {
                    return html`
                      <ontology-card
                        key="${data.id}"
                        id="${data.id}"
                        .data=${data}
                        ${flip({ id: data.id, options })}
                        selected
                      />
                    `;
                  }
                )}
              </div>
              <div class="cards-container children" id="children">
                ${repeat(
                  this.data.children,
                  (child) => child.id,
                  (child) => html`
                    <ontology-card
                      key="${child.id}"
                      .data=${child}
                      id="${child.id}"
                      ${flip({ id: child.id, options })}
                      @card_selected=${(e) => this._fetchData(e.detail.id)}
                      selected
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
}

customElements.define(
  'condition-disease-ontology-view',
  CondDiseaseOntologyView
);
