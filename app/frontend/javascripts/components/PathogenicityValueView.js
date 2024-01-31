import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { query } from 'lit/decorators/query.js';
import Styles from '../../stylesheets/object/component/pathogenicity-value-view.scss';

@customElement('pathogenicity-value-view')
export class PathogenicityValueView extends LitElement {
  static styles = [Styles];

  @property({ type: String }) _dataset = 'alphamissense';
  @property({ type: Array }) _values = [0, 1];
  @property({ type: Object }) _threshold = {
    'Likely benign': {
      color: '#9def3A',
      min: 0,
      max: 0.34,
    },
    Ambiguous: {
      color: '#bbba7e',
      min: 0.34,
      max: 0.564,
    },
    'Likely pathogenic': {
      color: '#ffae00',
      min: 0.564,
      max: 1,
    },
  };
  @state({ type: Number }) _sliderWidth = 100;

  @query('.pathogenicity-graph') _pathogenicityGraph;
  @query('.bar') _bar;

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener(
      'set-pathogenicity-value-view',
      this._onDataChanged
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener(
      'set-pathogenicity-value-view',
      this._onDataChanged
    );
  }

  _onDataChanged = (event) => {
    this._dataset = event.detail.dataset;
    this._values = event.detail.values;
    this._threshold = event.detail.threshold;
    this._setValueBar();
  };

  firstUpdated() {
    this._renderRuler();
    this._setValueBar();
  }
  _renderRuler() {
    const scale = document.createElement('div');
    scale.classList.add('scale');
    for (let i = 0; i <= 10; i++) {
      const newScale = scale.cloneNode();
      newScale.style.left = `calc(${i * 10 + '%'} - ${i / 10}px)`;
      this._pathogenicityGraph.appendChild(newScale);
    }
  }

  _setValueBar() {
    this._bar.style.left = this._values[0] * 100 + '%';
    this._bar.style.right = 100 - this._values[1] * 100 + '%';
    this._bar.style.backgroundImage = this._createGradient();
  }

  _createGradient() {
    const gradientStops = Object.entries(this._threshold).flatMap(
      ([_, value]) => {
        return [
          { color: value.color, division: value.min },
          { color: value.color, division: value.max },
        ];
      }
    );

    let rangeLeft = parseInt(this._bar.style.left) / 100 || 0;

    const gradientCss = gradientStops
      .map((stop) => {
        const position = (stop.division - rangeLeft) * this._sliderWidth;
        return `${stop.color} ${position}px`;
      })
      .join(', ');

    return `linear-gradient(to right, ${gradientCss})`;
  }

  get queryValue() {
    return {
      [this._dataset]: {
        score: {
          gte: parseFloat(this._values[0]),
          lte: parseFloat(this._values[1]),
        },
      },
    };
  }

  render() {
    return html`
      <div class="pathogenicity-graph">
        <div class="bar"></div>
      </div>
      <div class="range">
        <span class="from">${this._values[0]}</span> ~
        <span class="to">${this._values[1]}</span>
      </div>
    `;
  }
}

export default PathogenicityValueView;
