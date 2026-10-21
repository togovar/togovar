import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './FrequencyCountValueView'; // for embedding
import './ConditionDeleteriousnessPredictionSearch/PredictionValueView'; // for embedding
import type { AdvancedConditionTypeValue } from '../../advancedCondition';
import Style from '../../../stylesheets/web-components/condition-item-value-view.scss';

@customElement('condition-item-value-view')
export class ConditionItemValueView extends LitElement {
  static styles = [Style];

  @property({ type: String }) label: string = '';
  @property({ type: String }) conditionType: AdvancedConditionTypeValue | undefined;
  @property({ type: String }) value: string = '';
  @property({ type: Boolean }) deleteButton: boolean = false;

  /**
   * レンダリング後に `.inner` の幅を計測し、同じ条件グループ内のグラフ開始位置を共有する。
   * CSS カスタムプロパティはシャドウ境界を越えて継承されるため、frequency と prediction の
   * グラフ開始位置を同じカラムへ揃えられる。
   */
  protected override updated(): void {
    if (
      this.conditionType !== 'dataset' &&
      this.conditionType !== 'genotype' &&
      this.conditionType !== 'deleteriousness_prediction'
    )
      return;
    requestAnimationFrame(() => {
      this._alignGraphStart();
    });
  }

  /** 別条件行のグラフも揃えるため、値コンテナだけでなく条件グループにも列幅を共有する。 */
  private _alignGraphStart(): void {
    const valuesContainer = this.closest<HTMLElement>('.values-container');
    if (!valuesContainer) return;

    const group = valuesContainer.closest<HTMLElement>(
      '.advanced-search-condition-group-view'
    );
    const scope = group ?? valuesContainer;

    let maxWidth = 0;
    for (const view of scope.querySelectorAll(
      'condition-item-value-view'
    )) {
      const inner = view.shadowRoot?.querySelector<HTMLElement>('.inner');
      if (!inner) continue;
      maxWidth = Math.max(maxWidth, inner.scrollWidth);
    }

    if (maxWidth === 0) return;

    // .inner の右端から頻度バーまでの最小余白（px）
    const GAP = 8;
    // values-container の padding-left（16px）と合わせてグラフが
    // values-container 左端から最低 200px の位置になるよう下限を設ける
    const MIN_COLUMN = 150;
    const columnWidth = `${Math.max(Math.ceil(maxWidth) + GAP, MIN_COLUMN)}px`;
    (group ?? valuesContainer).style.setProperty(
      '--left-advanced-search-condition-graph',
      columnWidth
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
    } else if (this.conditionType === 'deleteriousness_prediction') {
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
