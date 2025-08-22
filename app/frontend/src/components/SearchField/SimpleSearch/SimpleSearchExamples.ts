import { LitElement, html, CSSResultGroup, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';

import Styles from '../../../../stylesheets/object/component/simple-search-examples.scss';

/** 例文データの型定義 */
export interface ExampleItem {
  key: string;
  value: string;
}

/** SimpleSearchExamples - Simple検索用の例表示コンポーネント */
@customElement('simple-search-examples')
export default class SimpleSearchExamples extends LitElement {
  static styles: CSSResultGroup = [Styles];

  /** 例文データの配列 */
  @property({ type: Array })
  examples: ExampleItem[] = [];

  /**
   * 例文クリック時のイベントハンドラー
   * @param example - クリックされた例文データ
   */
  private handleClick(example: ExampleItem): void {
    this.dispatchEvent(
      new CustomEvent('example-selected', {
        detail: example,
        bubbles: true,
        composed: true,
      })
    );
  }

  render(): TemplateResult {
    return html`
      ${map(
        this.examples,
        (example: ExampleItem) =>
          html`<dl @click=${() => this.handleClick(example)}>
            <dt>${example.key}</dt>
            <dd>${example.value}</dd>
          </dl>`
      )}
    `;
  }
}
