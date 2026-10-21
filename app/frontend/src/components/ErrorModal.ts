import { LitElement, css, html, type CSSResultGroup, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/** エラーメッセージだけを表示する責務に絞り、他コンポーネントから再利用できるよう独立させる。 */
@customElement('error-modal')
export class ErrorModal extends LitElement {
  static styles: CSSResultGroup = css`
    p {
      font-size: 2em;
      color: green;
    }
  `;

  /** 外部から属性・プロパティ両方でメッセージを受け取れるよう、Litリアクティブプロパティとして宣言する。 */
  @property({ type: String }) errorMessage: string = '';

  /** テンプレートとロジックを分離するため、描画はrenderだけに閉じる。 */
  render(): TemplateResult {
    return html`
      <div class="err-container" role="alert" aria-live="assertive">
        <p>${this.errorMessage}</p>
      </div>
    `;
  }
}
