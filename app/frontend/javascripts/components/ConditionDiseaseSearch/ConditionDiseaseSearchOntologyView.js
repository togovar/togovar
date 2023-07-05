import '../ErrorModal';

import { LitElement, html, css } from 'lit';
import { ref, createRef } from 'lit/directives/ref.js';

import { repeat } from 'lit/directives/repeat.js';

import './ConditionDiseaseSearchColumn';

import { cachedAxios } from '../../utils/cachedAxios';
import { API_URL } from '../../global';

class Container extends LitElement {
  flexRef = createRef();
  clipRef = createRef();
  nodeRef = createRef();
  movement = '';
  flexWidth = 0;
  deltaWidth = 0;
  nodeWidth = 0;
  gap = 0;
  animate = null;
  scrolledRect = null;
  API = new cachedAxios(`${API_URL}/api/inspect`);
  dataColumns = {
    _parents: [],
    parents: [],
    hero: [],
    children: [],
    _children: [],
  };
  animationOptions = {
    duration: 500,
    easing: 'ease-in-out',
  };

  static styles = css`
  :host {
    font-size: 10px;
    display: block;
    height: 100%
    position: relative;
  
  }

  .clip {
    height: 200px;
    overflow: hidden;
    position: relative;
  }

  .flex {
      height: 100%;
      display: flex;
      flex-direction: row;
  }

`;

  constructor() {
    super();
    this._id = '';
    this._columns = ['parents', 'hero', 'children'];
    this.data = {};
  }

  static get properties() {
    return {
      data: { type: Object, state: true },
      _id: { type: String, attribute: 'id' },
      _columns: {
        type: Array,
        state: true,
      },
    };
  }

  set _id(id) {
    if (this.data?.id !== id) {
      this._loadingStarted();
      this.API.get(`/disease?node=${id}`).then(({ data }) => {
        this.data = data;

        this._loadingEnded();
      });
    }
  }

  willUpdate(changedProperties) {
    if (changedProperties.has('data')) {
      if (changedProperties.get('data')) {
        if (this.data.id && changedProperties.get('data').id !== this.data.id) {
          // parents before update
          this.dataColumns._parents = changedProperties.get('data')
            ?.parents || [{ id: 'dummy', label: 'dummy' }];
          // children before update
          this.dataColumns._children = changedProperties.get('data')
            ?.children || [{ id: 'dummy', label: 'dummy' }];

          if (this._columns.length === 4) {
            let movement;
            if (this._columns.includes('_parents')) {
              movement = 'left';
            } else if (this._columns.includes('_children')) {
              movement = 'right';
            } else {
              movement = '';
            }

            // hero before update
            if (movement === 'left') {
              this.dataColumns.hero = this.dataColumns._children;
            } else if (movement === 'right') {
              this.dataColumns.hero = this.dataColumns._parents;
            }
          } else {
            this.dataColumns.hero = [this.data];
          }

          //parents after update
          this.dataColumns.parents = this.data?.parents || [];
          //children after update
          this.dataColumns.children = this.data?.children || [];
        }
      }
    }
    if (changedProperties.has('_columns')) {
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
  }

  firstUpdated() {
    this.API.get(`/disease?node=${this._id}`).then(({ data }) => {
      this.data = data;
    });
  }

  _loadingStarted() {
    this.dispatchEvent(
      new CustomEvent('loading-started', { bubbles: true, composed: true })
    );
  }

  _loadingEnded() {
    this.dispatchEvent(
      new CustomEvent('loading-ended', { bubbles: true, composed: true })
    );
  }

  _handleClick(e) {
    if (e.target?.role === 'parents' || e.target?.role === 'children') {
      this.scrolledRect = e.detail?.rect || null;

      this._loadingStarted();

      this.API.get(`/disease?node=${e.detail.id}`).then(({ data }) => {
        this._loadingEnded();
        this.data = data;
        this.updateComplete.then(() => {
          if (e.detail.role === 'children') {
            this.movement = 'left';

            this._columns = ['_parents', 'parents', 'hero', 'children'];
          } else if (e.detail.role === 'parents') {
            this.movement = 'right';

            this._columns = ['parents', 'hero', 'children', '_children'];
          }
          this.dispatchEvent(
            new CustomEvent('disease-selected', {
              detail: {
                id: data.id,
                label: data.label,
              },
              bubbles: true,
              composed: true,
            })
          );
        });
      });
    }
  }

  updated() {
    if (this.movement === 'left') {
      this.animate = this.flexRef.value.animate(
        [
          { transform: 'translateX(0)' },
          {
            transform: `translateX(${-this.deltaWidth}px)`,
          },
        ],
        this.animationOptions
      );
    } else if (this.movement === 'right') {
      this.animate = this.flexRef.value.animate(
        [
          {
            transform: `translateX(${-this.deltaWidth}px)`,
          },
          { transform: 'translateX(0)' },
        ],
        this.animationOptions
      );
    }

    if (this.animate) {
      this.animate.onfinish = () => {
        this.movement = '';
        this._columns = ['parents', 'hero', 'children'];
        this.animate = null;
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
                  .heroId="${column === 'hero' ? this.data.id : undefined}"
                  .scrolledHeroRect="${this.scrolledRect}"
                  .animationOptions="${this.animationOptions}"
                ></ontology-column>
              `;
            }
          )}
        </div>
      </div>
    `;
  }
}

customElements.define('condition-disease-ontology-view', Container);
