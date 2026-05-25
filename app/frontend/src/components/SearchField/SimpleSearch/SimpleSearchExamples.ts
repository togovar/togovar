import { LitElement, html } from 'lit';
import type { CSSResultGroup, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';

import Styles from '../../../../stylesheets/object/component/simple-search-examples.scss';
import type { ExampleItem, ExampleSelectedDetail } from './SimpleSearchTypes';

/** SimpleSearchExamples - Simple検索用の例表示コンポーネント */
@customElement('simple-search-examples')
export default class SimpleSearchExamples extends LitElement {
  static styles: CSSResultGroup = [Styles];

  /** 例文データの配列 */
  @property({ type: Array })
  examples: ExampleItem[] = [];

  /**
   * 例文クリック時のイベントハンドラー
   * @param e - クリックイベント
   */
  private handleClick = (e: Event): void => {
    const button = e.currentTarget as HTMLButtonElement;
    const key = button.dataset.key;
    const value = button.dataset.value;
    if (!key || !value) return;

    const detail: ExampleSelectedDetail = {
      key,
      value,
    };

    this.dispatchEvent(
      new CustomEvent<ExampleSelectedDetail>('example-selected', {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  };

  private getValues(example: ExampleItem): string[] {
    return Array.isArray(example.value) ? example.value : [example.value];
  }

  render(): TemplateResult {
    return html`
      ${map(
        this.examples,
        (example: ExampleItem) => {
          const values = this.getValues(example);
          return html`<dl>
            <dt>${example.key}</dt>
            <dd>
              ${map(
                values,
                (value, index) =>
                  html`${index > 0 ? ', ' : ''}<button
                      type="button"
                      data-key=${example.key}
                      data-value=${value}
                      @click=${this.handleClick}
                    >
                      ${value}
                    </button>`
              )}
            </dd>
          </dl>`;
        }
      )}
    `;
  }
}
