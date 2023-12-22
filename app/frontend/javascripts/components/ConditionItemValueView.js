import { LitElement, html, css, nothing } from 'lit';
import './FrequencyCountValueView'; // for embedding
import Style from '../../stylesheets/object/component/condition-item-value-view.scss';

export default class ConditionItemValueView extends LitElement {
  static styles = [
    css`
      :host {
        --height-container: var(
          --height-advanced-search-condition-values-container
        );
        --height: var(--height-advanced-search-condition-value);
        display: inline-block;
      }
      :host([data-condition-type='dataset']) {
        display: block;
        position: relative;
      }
      :host > .inner {
        height: var(--height);
        line-height: 1;
        padding: 0 10px;
        background-color: white;
        border: solid 1px var(--color-key-dark1);
        border-radius: calc(var(--height) * 0.5);
        font-weight: bold;
        margin-right: 2px;
      }
      :host([data-condition-type='dataset']) > .inner {
        min-width: 120px;
      }
      :host([data-condition-type='dataset']) > .inner::before {
        font-family: fontello;
        content: var(--char-dataset);
        margin-right: 4px;
      }
      :host([data-value='jga_ngs']) > .inner,
      :host([data-value='jga_snp']) > .inner {
        border-color: var(--color-dataset-jga);
        background-color: var(--color-dataset-jga-light);
      }
      :host([data-value='jga_ngs']) > .inner::before,
      :host([data-value='jga_snp']) > .inner::before {
        color: var(--color-dataset-jga);
      }
      :host([data-value='tommo']) > .inner {
        border-color: var(--color-dataset-tommo);
        background-color: var(--color-dataset-tommo-light);
      }
      :host([data-value='tommo']) > .inner::before {
        color: var(--color-dataset-tommo);
      }
      :host([data-value='hgvd']) > .inner,
      :host([data-value='mgend']) > .inner {
        border-color: var(--color-dataset-hgvd);
        background-color: var(--color-dataset-hgvd-light);
      }
      :host([data-value='hgvd']) > .inner::before,
      :host([data-value='mgend']) > .inner::before {
        color: var(--color-dataset-hgvd);
      }
      :host([data-value='gem_j_wga']) > .inner {
        border-color: var(--color-dataset-gemj);
        background-color: var(--color-dataset-gemj-light);
      }
      :host([data-value='gem_j_wga']) > .inner::before {
        color: var(--color-dataset-gemj);
      }
      :host([data-value='bbj']) > .inner {
        border-color: var(--color-dataset-bbj);
        background-color: var(--color-dataset-bbj-light);
      }
      :host([data-value='bbj']) > .inner::before {
        color: var(--color-dataset-bbj);
      }
      :host([data-value='clinvar']) > .inner,
      :host([data-value='exac']) > .inner,
      :host([data-value='gnomad']) > .inner {
        border-color: var(--color-dataset-foreign);
        background-color: var(--color-dataset-foreign-light);
      }
      :host([data-value='clinvar']) > .inner::before,
      :host([data-value='exac']) > .inner::before,
      :host([data-value='gnomad']) > .inner::before {
        color: var(--color-dataset-foreign);
      }
    `, Style,
  ];

  static properties = {
    label: { type: String },
    conditionType: { type: String },
    value: { type: String },
    deleteButton: { type: Boolean },
  };

  constructor() {
    super();
    // Declare reactive properties
    this.label = '';
    this.conditionType = '';
    this.value = '';

    this.deleteButton = false;
  }

  #handleDelete(e) {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('delete-condition-item', {
        detail: this.value,
        bubbles: true,
      })
    );
  }

  // Render the UI as a function of component state
  render() {
    this.dataset.conditionType = this.conditionType;
    this.dataset.value = this.value;

    let option = '';
    if (this.conditionType == 'dataset') {
      option = html`<frequency-count-value-view
        data-dataset="${this.value}"
      ></frequency-count-value-view>`;
    }
    return html`<span
        class="inner"
        data-condition-type="${this.conditionType}"
        data-value="${this.value}"
        >${this.label}${this.deleteButton
          ? html`<button
              class="delete"
              part="delete-tag-btn"
              @click=${this.#handleDelete}
            ></button>`
          : nothing}</span
      >
      ${option} `;
  }
}

customElements.define('condition-item-value-view', ConditionItemValueView);
