import { LitElement, html, nothing, TemplateResult, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './FrequencyCountValueView'; // for embedding
import './ConditionPathogenicityPredictionSearch/PredictionValueView'; // for embedding
import Style from '../../stylesheets/object/component/condition-item-value-view.scss';

@customElement('condition-item-value-view')
class ConditionItemValueView extends LitElement {
  static styles = [unsafeCSS(Style)];

  @property({ type: String }) label: string = '';
  @property({ type: String }) conditionType: string = '';
  @property({ type: String }) value: string = '';
  @property({ type: Boolean }) deleteButton: boolean = false;

  private _handleDelete(e: Event): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('delete-condition-item', {
        detail: this.value,
        bubbles: true,
      })
    );
  }

  // Render the UI as a function of component state
  render(): TemplateResult {
    if (this.dataset) {
      this.dataset.conditionType = this.conditionType;
      this.dataset.value = this.value;
    }

    let option: TemplateResult | string = '';
    if (this.conditionType === 'dataset' || this.conditionType === 'genotype') {
      option = html`<frequency-count-value-view
        data-dataset="${this.value}"
      ></frequency-count-value-view>`;
    }
    if (this.conditionType === 'pathogenicity_prediction') {
      option = html` <prediction-value-view
        data-dataset=${this.value}
      ></prediction-value-view>`;
    }
    return html`
      <div class="condition-item-value-container">
        <span
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
        ${option}
      </div>
    `;
  }
}

export default ConditionItemValueView;
