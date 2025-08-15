import { LitElement, html, CSSResultGroup, TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';

import Styles from '../../../../stylesheets/object/component/simple-search-button.scss';

/**
 * SearchButton - 検索ボタンコンポーネント
 */
@customElement('search-button')
export default class SearchButton extends LitElement {
  static styles: CSSResultGroup = [Styles];

  constructor() {
    super();
  }

  render(): TemplateResult {
    return html`<button class="btn"></button>`;
  }
}
