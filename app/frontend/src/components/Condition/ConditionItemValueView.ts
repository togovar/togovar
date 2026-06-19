import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './FrequencyCountValueView'; // for embedding
import './ConditionPathogenicityPredictionSearch/PredictionValueView'; // for embedding
import type { ConditionTypeValue } from '../../definition';
import Style from '../../../stylesheets/web-components/condition-item-value-view.scss';

@customElement('condition-item-value-view')
export class ConditionItemValueView extends LitElement {
  static styles = [Style];

  @property({ type: String }) label: string = '';
  @property({ type: String }) conditionType: ConditionTypeValue | undefined;
  @property({ type: String }) value: string = '';
  @property({ type: Boolean }) deleteButton: boolean = false;

  /**
   * レンダリング後に `.inner` の幅を計測し、同じ `.values-container` 内の全
   * condition-item-value-view の最大幅を `--left-advanced-search-condition-graph`
   * としてコンテナに設定する。CSS カスタムプロパティはシャドウ境界を越えて継承されるため、
   * 各コンポーネント内の `frequency-count-value-view` の開始位置が自動的に揃う。
   */
  protected override updated(): void {
    if (this.conditionType !== 'dataset' && this.conditionType !== 'genotype')
      return;
    requestAnimationFrame(() => {
      this._alignFrequencyBarStart();
    });
  }

  private _alignFrequencyBarStart(): void {
    const valuesContainer = this.closest<HTMLElement>('.values-container');
    if (!valuesContainer) return;

    let maxWidth = 0;
    for (const view of valuesContainer.querySelectorAll(
      'condition-item-value-view'
    )) {
      const inner = view.shadowRoot?.querySelector<HTMLElement>('.inner');
      if (!inner) continue;
      maxWidth = Math.max(maxWidth, inner.scrollWidth);
    }

    if (maxWidth === 0) return;

    // .inner の右端から頻度バーまでの最小余白（px）
    const GAP = 8;
    // values-container の padding-left（16px）と合わせて frequency-count-value-view が
    // values-container 左端から最低 200px の位置になるよう下限を設ける
    const MIN_COLUMN = 150;
    valuesContainer.style.setProperty(
      '--left-advanced-search-condition-graph',
      `${Math.max(Math.ceil(maxWidth) + GAP, MIN_COLUMN)}px`
    );
  }

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
                type="button"
                aria-label="Remove condition value"
                @click=${this._handleDelete}
              ></button>`
            : nothing}
        </span>
        ${option}
      </div>
    `;
  }
}
