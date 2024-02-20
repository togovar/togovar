import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './FrequencyCountValueView'; // for embedding
import './ConditionPathogenicityPredictionSearch/PredictionValueView'; // for embedding
import Style from '../../stylesheets/object/component/condition-item-value-view.scss';

@customElement('condition-item-value-view')
class ConditionItemValueView extends LitElement {
  static styles = [Style];

  @property({ type: String }) label;
  @property({ type: String }) conditionType;
  @property({ type: String }) value;
  @property({ type: Boolean }) deleteButton = false;

  _handleDelete(e) {
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
    if (this.conditionType == 'pathogenicity_prediction') {
      option = html` <prediction-value-view
        data-dataset=${this.value}
      ></prediction-value-view>`;
    }
    return html`<span
        class="inner"
        data-condition-type="${this.conditionType}"
        data-value=${this.value}
      >
        ${this.label}${this.deleteButton
          ? html`<button
              class="delete"
              part="delete-tag-btn"
              @click=${this._handleDelete}
            ></button>`
          : nothing}</span
      >
      ${option} `;
  }
}

export default ConditionItemValueView;
