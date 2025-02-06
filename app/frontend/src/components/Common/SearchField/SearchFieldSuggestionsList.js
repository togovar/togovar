import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import Styles from '../../../../stylesheets/object/component/search-field-suggestions-list.scss';
import { scrollMeUp } from './scrollMeUp';

/** Class to create a list of suggestions */
@customElement('search-field-suggestions-list')
class SearchFieldSuggestionsList extends LitElement {
  static styles = [Styles];
  /** @property {Array} suggestData - suggestions data */
  @property({ type: Array }) suggestData = [];

  /** @property {numbar} highlightedSuggestionIndex - Highlighted item's index (by keys) */
  @property({ type: Number }) highlightedSuggestionIndex = -1;

  /** @property {string} itemIdKey - What of an item to map to dispatched event's detail.id */
  @property() itemIdKey = '';

  /** @property {string} itemLabelKey - What of an item to map to dispatched event's detail.label */
  @property() itemLabelKey = '';

  /** @property {string} subTextKey - If there is alias_of -kind of data, where in data to see for it */
  @property() subTextKey = '';

  /** @property {string} title - Column title in case of Simple search */
  @property() title = '';

  /**
   * @private
   * @param {{term: string, alias_of: string}} item */
  _handleSelect(item) {
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
      ${this.title ? html`<h3 class="title">${this.title}</h3>` : nothing}
      <ul class="list">
        ${!this.suggestData || this.suggestData.length === 0
          ? html`<li class="item -empty">No results</li>`
          : map(
              this.suggestData,
              (item, index) => html`
                <li
                  class="item ${this.highlightedSuggestionIndex === index
                    ? '-selected'
                    : ''}"
                  @mousedown="${() => this._handleSelect(item)}"
                  ${scrollMeUp(this.highlightedSuggestionIndex === index)}
                >
                  ${unsafeHTML(item?.highlight || item?.[this.itemLabelKey])}
                  ${this.subTextKey && item?.[this.subTextKey]
                    ? html`<span class="sub">
                        alias: ${item[this.subTextKey]}</span
                      >`
                    : nothing}
                </li>
              `
            )}
      </ul>
    `;
  }
}

export default SearchFieldSuggestionsList;
