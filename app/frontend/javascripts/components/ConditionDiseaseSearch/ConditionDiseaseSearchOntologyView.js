import { LitElement, css, html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import { ref, createRef } from 'lit/directives/ref.js';

// import { flip } from './flip';

import './OntologyCard';
import '../ErrorModal';
import './ConditionDiseaseSearchColumn';
import CondDiseaseColumn from './ConditionDiseaseSearchColumn';

const DISEASE_ADVANCED_SEARCH_URL = `https://togovar-stg.biosciencedbc.jp/api/inspect/disease?node=`;

export default class CondDiseaseOntologyView extends LitElement {
  containerRef = createRef();
  nColumns = 3;
  movement = '';

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

      position: relative;
      overflow: hidden;
    }

    #pre-parents {
      position: absolute;
      left: -400px;
      top: 0;
      width: 1px;
    }

    .clip {
      display: block;
      width: 100%;
      height: 300px;
      position: relative;
      overflow: hidden;
    }

    .flex {
      position: absolute;
      width: 100%;
      height: 200px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }

    .flex > div {
      background-color: aqua;
      width: 100px;
      height: 200px;
      cursor: pointer;
    }

    #post-children {
      position: absolute;
      right: -400px;
      top: 0;
      width: 1px;
    }

    .cards-container {
      position: relative;
      height: 400px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
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
    this.addEventListener('card_selected', this._handleCardSelected);
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
        console.log('error fetching');
        this.error = err.message;
      })
      .finally(() => {
        this.loading = false;
      });
  }

  onClickRight = (e) => {
    const flex = this.containerRef.value;
    this.movement = 'left';
    const newDiv = document.createElement('div');
    const deltaWidth =
      (flex.lastElementChild.getBoundingClientRect().x -
        flex.firstElementChild.getBoundingClientRect().x) /
      (this.nColumns - 1);

    flex.style.width = `${flex.getBoundingClientRect().width + deltaWidth}px`;

    flex.append(newDiv);
    flex.style.transition = 'ease transform 1s';

    flex.style.transform = `translate(${-deltaWidth}px,0)`;
  };

  onClickLeft = (e) => {
    const flex = this.containerRef.value;
    this.movement = 'right';
    const deltaWidth =
      (flex.lastElementChild.getBoundingClientRect().x -
        flex.firstElementChild.getBoundingClientRect().x) /
      (this.nColumns - 1);

    const newDiv = new CondDiseaseColumn(); //document.createElement('ontology-column');
    newDiv.nodes = flex.style.width = `${
      flex.getBoundingClientRect().width + deltaWidth
    }px`;

    flex.prepend(newDiv);

    flex.style.transform = `translate(${-deltaWidth}px,0)`;

    requestAnimationFrame(() => {
      flex.style.transition = 'ease transform 1s';
      flex.style.transform = `translate(0,0)`;
    });
  };

  _init() {
    const flex = this.containerRef.value;
    let divLast = this.containerRef.value.lastElementChild;
    let divFirst = this.containerRef.value.firstElementChild;

    divLast.addEventListener('click', this.onClickRight);
    divFirst.addEventListener('click', this.onClickLeft);

    flex.addEventListener('transitionend', () => {
      divFirst.removeEventListener('click', this.onClickLeft);
      divLast.removeEventListener('click', this.onClickRight);

      if (this.movement === 'right') {
        flex.lastElementChild.remove();
      } else if (this.movement === 'left') {
        flex.firstElementChild.remove();
      }

      flex.style = '';
      divFirst = flex.firstElementChild;
      divLast = flex.lastElementChild;
      divFirst.addEventListener('click', this.onClickLeft);
      divLast.addEventListener('click', this.onClickRight);
    });
  }

  set diseaseId(id) {
    this._fetchData(id);
  }

  updated() {
    if (
      !this.loading &&
      !this.error &&
      this.data &&
      Object.keys(this.data).length
    ) {
      console.log(this.data);
      this._init();
    }
  }

  keepLastValues() {
    return;
  }

  _handleCardSelected(e) {
    e.stopPropagation();
    console.log('_handleCardSelected', e.detail.id);
    this.diseaseId = e.detail.id;
  }

  disconnectedCallback() {
    this.removeEventListener('card_selected', this._handleCardSelected);
  }

  render() {
    const options = {
      duration: 5000,
      timingFunction: 'ease-out', // 'steps(5, end)'
    };

    return html`
      <div class="search-field-view">
        <h2>Advanced Search</h2>
        ${!this.data || !Object.keys(this.data).length
          ? (this.loading && html`<div>Loading...</div>`) ||
            (this.error && html`<error-modal errorMessage="${this.error}" />`)
          : html`<div class="clip">
              <div class="flex" ${ref(this.containerRef)} >
              <ontology-column .nodes=${this.data?.parents || []}
              @card_selected="${this._handleCardSelected}" >
                     </ontology-column>
                
                <ontology-column .nodes=${[
                  this.data,
                ]} selected /></ontology-column>

                <ontology-column .nodes=${
                  this.data?.children || []
                } @card_selected="${this._handleCardSelected}"
            /></ontology-column>
               
               
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
