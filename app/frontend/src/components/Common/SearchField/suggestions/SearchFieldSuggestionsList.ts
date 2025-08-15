import { LitElement, html, nothing, CSSResultGroup, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import Styles from '../../../../../stylesheets/object/component/search-field-suggestions-list.scss';
import { scrollMeUp } from '../scrollMeUp';

/** Suggestion data structure */
interface SuggestionItem {
  term?: string;
  alias_of?: string;
  highlight?: string;
  id?: string;
  name?: string;
  symbol?: string;
  [key: string]: any;
}

/** Class to create a list of suggestions */
@customElement('search-field-suggestions-list')
class SearchFieldSuggestionsList extends LitElement {
  static styles: CSSResultGroup = [Styles];

  /** Suggestions data */
  @property({ type: Array }) suggestData: SuggestionItem[] = [];

  /** Highlighted item's index (by keys) */
  @property({ type: Number }) highlightedSuggestionIndex: number = -1;

  /** What of an item to map to dispatched event's detail.id */
  @property() itemIdKey: string = '';

  /** What of an item to map to dispatched event's detail.label */
  @property() itemLabelKey: string = '';

  /** If there is alias_of -kind of data, where in data to see for it */
  @property() subTextKey: string = '';

  /** Column title in case of Simple search */
  @property() title: string = '';

  /**
   * Handle suggestion selection
   * @param item - The selected suggestion item
   */
  private _handleSelect(item: SuggestionItem): void {
    this.dispatchEvent(
      new CustomEvent('suggestion-selected', {
        detail: item,
        bubbles: true,
        composed: true,
      })
    );
  }

  render(): TemplateResult {
    return html`
      ${this.title ? html`<h3 class="title">${this.title}</h3>` : nothing}
      <ul class="list">
        ${!this.suggestData || this.suggestData.length === 0
          ? html`<li class="item -empty">No results</li>`
          : map(
              this.suggestData,
              (item: SuggestionItem, index: number) => html`
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
