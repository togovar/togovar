import { LitElement, html } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import Styles from '../../../../stylesheets/object/component/suggestions-list.scss';
import { scrollMeUp } from './scrollMeUp';

export default class SuggestionsList extends LitElement {
  static get properties() {
    return {
      /** Suggestions data */
      suggestData: { type: Array },
      /** Highlighted item's index (by keys) */
      highlightedSuggestionIndex: {
        type: Number,
        attribute: 'highlighted-suggestion-index',
      },
      /** What of an item to map to dispatched event's detail.id */
      itemIdKey: { type: String, attribute: 'item-id-key' },
      /** What of an item to map to dispatched event's detail.label */
      itemLabelKey: { type: String, attribute: 'item-label-key' },
    };
  }

  static get styles() {
    return [Styles];
  }

  constructor() {
    super();
    this.suggestData = [];
    this.highlightedSuggestionIndex = -1;
    this.itemIdKey = '';
    this.itemLabelKey = '';
  }

  #handleSelect(item) {
    this.dispatchEvent(
      new CustomEvent('suggestion-selected', {
        detail: item,
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      <ul class="list">
        ${this.suggestData.length === 0
          ? html`<li class="item -empty">No results</li>`
          : repeat(
              this.suggestData,
              (item) => item[this.itemIdKey],
              (item, index) => html`
                <li
                  class="item ${this.highlightedSuggestionIndex === index
                    ? '-selected'
                    : ''}"
                  @mousedown="${() => this.#handleSelect(item)}"
                  ${scrollMeUp(this.highlightedSuggestionIndex === index)}
                >
                  ${unsafeHTML(item?.highlight || item?.[this.itemLabelKey])}
                </li>
              `
            )}
      </ul>
    `;
  }

  //   createRenderRoot() {
  //     return this;
  //   }
}

customElements.define('suggestions-list', SuggestionsList);
