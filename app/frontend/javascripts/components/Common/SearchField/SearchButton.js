import { LitElement, html } from 'lit';

import Styles from '../../../../stylesheets/object/component/simple-search-button.scss';

export default class SearchButton extends LitElement {
  static get styles() {
    return [Styles];
  }

  constructor() {
    super();
  }

  render() {
    return html`<button class="btn">Search</button>`;
  }
}

customElements.define('search-button', SearchButton);
