import { LitElement, css, html } from 'lit';
import './OntologyCard';
import { directive } from 'lit-html';

const DISEASE_ADVANCED_SEARCH_URL = `https://togovar-stg.biosciencedbc.jp/api/inspect/disease?node=`;

const flip = directive((options = { duration: 300 }, onfinish) => (part) => {
  const firstElement = part.committer.element;
  // Don't animate first render
  if (!firstElement.isConnected) {
    return;
  }
  // Capture render position before update
  const first = firstElement.getBoundingClientRect();
  // Nodes may be re-used so identify via a key.
  const container = firstElement.parentNode;
  const key = firstElement.getAttribute('key');
  requestAnimationFrame(() => {
    // Find matching element.
    const lastElement = container.querySelector(`[key="${key}"]`);
    if (!lastElement) {
      return;
    }
    // Capture render position after update
    const last = lastElement.getBoundingClientRect();
    // Calculate deltas and animate if something changed.
    const topChange = first.top - last.top;
    if (topChange !== 0) {
      lastElement.animate(
        [{ transform: `translate(${topChange}px, ${topChange}px)` }, {}],
        options
      ).onfinish = onfinish;
    }
  });
});

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
        hasChanged(newVal, oldVal) {
          console.log('hasChanged', oldVal, newVal);
          this.children = newVal.children;
        },
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
    .exit {
      animation-duration: 1s;
      animation-name: slideout;
    }
    @keyframes slideout {
      from {
        opacity: 1;
      }
      to {
        opacity: 0.1;
      }
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

  duration = 1000;

  // rotate() {
  //   // async/debounce the animation
  //   if (!this._scheduled) {
  //     this._scheduled = setTimeout(() => {
  //       this._scheduled = undefined;
  //       shuffleArray(this.items);
  //       this.requestUpdate();
  //     }, this.duration);
  //   }
  // }

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
                        key="${parent.id}"
                        ...=${flip({ duration: this.duration }, () => {})}
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
                        key="${parent.id}"
                        ...=${flip({ duration: this.duration }, () =>
                          this.rotate()
                        )}
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
}

customElements.define(
  'condition-disease-ontology-view',
  CondDiseaseOntologyView
);
