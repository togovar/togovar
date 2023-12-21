import { LitElement, html, nothing } from 'lit';
import './FrequencyCountValueView'; // for embedding
import Style from '../../stylesheets/object/component/condition-item-value-view.scss';

export default class ConditionItemValueView extends LitElement {
  static styles = [Style];

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
