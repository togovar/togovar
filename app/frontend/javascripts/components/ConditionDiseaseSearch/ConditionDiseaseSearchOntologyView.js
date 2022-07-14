import { LitElement, css, html } from 'lit';
import './OntologyCard';
import { intersection } from '../../utils/intersection';

const DISEASE_ADVANCED_SEARCH_URL = `https://togovar-stg.biosciencedbc.jp/api/inspect/disease?node=`;

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
        hasChanged(oldValue, newValue) {},
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

  requestUpdate(name, oldValue) {
    if (name === 'data') {
      const newValue = this[name];
      if (newValue) {
        const ids = newValue.parents
          .map((p) => p.id)
          .concat(newValue.id)
          .concat(newValue.children.map((c) => c.id));

        const intersect = intersection(ids);
        const oldParentsIds = oldValue.parents.map((p) => p.id);
        const oldChildrenIds = oldValue.children.map((c) => c.id);
        this.parents.enter = intersect.enter.filter(
          (item) => !oldParentsIds.includes(item)
        );
        this.parents.exit = intersect.exit.filter(
          (item) => !oldParentsIds.includes(item)
        );
        this.children.enter = intersect.enter.filter(
          (item) => !oldChildrenIds.includes(item)
        );
        this.children.exit = intersect.exit.filter(
          (item) => !oldChildrenIds.includes(item)
        );

        const exitNodes = this.querySelectorAll('ontology-card').filter(
          (node) => intersect.exit.includes(node.id)
        );
        this._exitNodes(exitNodes);
      }
    }
    return super.requestUpdate(name, oldValue);
  }

  _exitNodes(nodeList) {
    nodeList.forEach((node) => {
      node.addEventListener('transitionend', () => {
        node.remove();
      });
      node.classList.add('exit');
    });
  }

  // shouldUpdate(changed) {
  //   console.log('shouldUpdate', changed);
  //   if (
  //     changed.has('data') &&
  //     changed.get('data') &&
  //     Object.keys(changed.get('data')).length
  //   ) {
  //     const changedData = changed.get('data');
  //     console.log('changedData', changedData);
  //     const ids = changedData.parents
  //       .map((p) => p.label)
  //       .concat(changedData.label)
  //       .concat(changedData.children.map((c) => c.label));

  //     console.log(intersection(ids));
  //     //     const changedData = changed.get('data');
  //     //     console.log('changedData', changedData);
  //     //     console.log(this.querySelector(`#${changedData.id}`));
  //     //   }
  //   }
  //   return true;
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
}

customElements.define(
  'condition-disease-ontology-view',
  CondDiseaseOntologyView
);
