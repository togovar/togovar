import './OntologyCard';
import '../ErrorModal';
import './ConditionDiseaseSearchColumn';

// import { Task } from '@lit-labs/task';
import { LitElement, html, css } from 'lit';
import { ref, createRef } from 'lit/directives/ref.js';

import { repeat } from 'lit/directives/repeat.js';

import axios from 'axios';

class Container extends LitElement {
  nColumns = 3;
  flexRef = createRef();
  clipRef = createRef();
  nodeRef = createRef();
  movement = '';
  flexWidth = 0;
  deltaWidth = 0;
  nodeWidth = 0;
  gap = 0;

  static styles = css`
  :host {
    font-size: 10px;
    display: block;
    height: 100%
    position: relative;
  
  }


  .clip {
    width: 100%;
    height: 200px;
    overflow: hidden;
    position: relative;
  }

  .flex {
    height: 100%;
    display: flex;
    justify-content: space-between;
    gap: 10px;
  }

`;

  constructor() {
    super();
    this._id = '';

    this.loading = false;
    this._columns = ['parents', 'hero', 'children'];
    this.data = {};
    this.dataColumns = {
      _parents: [],
      parents: [],
      hero: [],
      children: [],
      _children: [],
    };
  }

  static get properties() {
    return {
      data: { type: Object, state: true },
      loading: { type: Boolean, state: true },
      _id: { type: String, attribute: '_id' },
      _columns: { type: Array, state: true },
    };
  }

  set _id(id) {
    this.API.get(`/disease?node=${id}`).then(({ data }) => {
      this.data = data;
    });
  }

  refMap = new Map();

  API = axios.create({
    baseURL: 'https://togovar-dev.biosciencedbc.jp/api/inspect',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  // _apiTask = new Task(
  //   this,
  //   async (_id) => {
  //     const { data } = await this.API.get(`/disease?node=${_id}`);

  //     this.data = data;

  //     return data;
  //   },
  //   () => this._id
  // );

  // TODO memorize scroll position inside column before transition

  willUpdate(changedProperties) {
    if (changedProperties.has('data')) {
      if (changedProperties.get('data')) {
        if (changedProperties.get('data').id !== this.data.id) {
          this.dataColumns._parents = changedProperties.get('data')
            ?.parents || [{ id: 'dummy', label: 'dummy' }];
          this.dataColumns._children = changedProperties.get('data')
            ?.children || [{ id: 'dummy', label: 'dummy' }];

          this.dataColumns.hero = [this.data];

          this.dataColumns.parents = this.data?.parents || [];
          this.dataColumns.children = this.data?.children || [];
        }
      }
    }
  }

  // firstUpdated() {
  //   this.API.get(`/disease?node=${this._id}`).then(({ data }) => {
  //     this.data = data;
  //   });
  // }

  _handleClick(e) {
    if (e.target?.role === 'parents' || e.target?.role === 'children') {
      this._id = e.detail.id;

      this.API.get(`/disease?node=${this._id}`).then(({ data }) => {
        if (e.detail.role === 'children') {
          this.movement = 'left';
          this._columns = ['_parents', 'parents', 'hero', 'children'];
        } else if (e.detail.role === 'parents') {
          this.movement = 'right';
          this._columns = ['parents', 'hero', 'children', '_children'];
        }

        this.data = data;
      });
    }
  }

  shouldUpdate(changed) {
    if (changed.has('_columns')) {
      this.nodeWidth =
        this.nodeRef.value?.getBoundingClientRect().width -
          (this.nodeRef.value?.getBoundingClientRect().right -
            this.clipRef.value?.getBoundingClientRect().right) || 0;
      this.gap =
        (this.clipRef.value?.getBoundingClientRect().width -
          this.nodeWidth * 3) /
        2;

      this.flexWidth =
        this._columns.length === 4
          ? this.nodeWidth * this._columns.length +
            (this._columns.length - 1) * this.gap +
            'px'
          : '100%';

      this.deltaWidth = this.nodeWidth + this.gap;
    }
    return true;
  }

  updated() {
    let animate;

    if (this.movement === 'left') {
      animate = this.flexRef.value.animate(
        [
          { transform: 'translateX(0)' },
          {
            transform: `translateX(${-this.deltaWidth}px)`,
          },
        ],
        {
          duration: 1000,
          easing: 'ease-out',
        }
      );
    } else if (this.movement === 'right') {
      animate = this.flexRef.value.animate(
        [
          {
            transform: `translateX(${-this.deltaWidth}px)`,
          },
          { transform: 'translateX(0)' },
        ],
        {
          duration: 1000,
          easing: 'ease-out',
        }
      );
    }
    if (animate) {
      animate.onfinish = () => {
        this.movement = '';
        this._columns = ['parents', 'hero', 'children'];

        this.requestUpdate();
      };
    }
  }

  render() {
    return html`
      <div class="clip" ${ref(this.clipRef)}>
        <div
          class="flex"
          @column-click="${this._handleClick}"
          style="width: ${this.flexWidth}"
          ${ref(this.flexRef)}
        >
          ${repeat(
            this._columns,
            (column) => column,
            (column) => {
              return html`
                <ontology-column
                  .role="${column}"
                  .nodes="${this.dataColumns[column].length
                    ? this.dataColumns[column]
                    : [{ id: 'dummy', label: 'dummy' }]}"
                  ${ref(this.nodeRef)}
                />
              `;
            }
          )}
        </div>
      </div>
    `;
  }
}

customElements.define('condition-disease-ontology-view', Container);
