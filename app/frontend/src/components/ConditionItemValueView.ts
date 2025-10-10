import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './FrequencyCountValueView'; // for embedding
import './ConditionPathogenicityPredictionSearch/PredictionValueView'; // for embedding
import type { ConditionTypeValue } from '../definition';
import Style from '../../stylesheets/object/component/condition-item-value-view.scss';

@customElement('condition-item-value-view')
export class ConditionItemValueView extends LitElement {
  static styles = [Style];

  @property({ type: String }) label: string = '';
  @property({ type: String }) conditionType: ConditionTypeValue | undefined;
  @property({ type: String }) value: string = '';
  @property({ type: Boolean }) deleteButton: boolean = false;

  private _handleDelete(e: Event): void {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('delete-condition-item', {
        detail: this.value,
        bubbles: true,
        composed: true,
      })
    );
  }

  // Render the UI as a function of component state
  render(): TemplateResult {
    if (this.dataset) {
      if (this.conditionType) {
        this.dataset.conditionType = this.conditionType;
      }
      this.dataset.value = this.value ?? '';
    }

    // empty is nothing
    let option: TemplateResult | typeof nothing = nothing;

    if (this.conditionType === 'dataset' || this.conditionType === 'genotype') {
      option = html`
        <frequency-count-value-view data-dataset="${this.value}">
        </frequency-count-value-view>
      `;
    } else if (this.conditionType === 'pathogenicity_prediction') {
      option = html`
        <prediction-value-view data-dataset="${this.value}">
        </prediction-value-view>
      `;
    }

    return html`
      <div class="condition-item-value-container">
        <span
          class="inner"
          data-condition-type="${this.conditionType ?? ''}"
          data-value="${this.value}"
        >
          ${this.label}
          ${this.deleteButton
            ? html`<button
                class="delete"
                part="delete-tag-btn"
                @click=${this._handleDelete}
              ></button>`
            : nothing}
        </span>
        ${option}
      </div>
    `;
  }
}
