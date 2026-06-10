import { LitElement, html, nothing } from 'lit';
import type { CSSResultGroup, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { map } from 'lit/directives/map.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import Styles from '../../../../stylesheets/object/component/search-field-suggestions-list.scss';
import { scrollIntoView } from './scrollIntoView';
import type { SuggestionData } from './types';

/**
 * LitテンプレートでscrollIntoViewディレクティブを型安全に呼び出すための関数型。
 * directive()の戻り値はLit内部型のため、テンプレート内での使用に限定した型として定義する
 */
type ScrollIntoViewDirective = (selected: boolean) => unknown;

/** サジェスト候補の一覧を表示するカスタムエレメント */
@customElement('search-field-suggestions-list')
class SearchFieldSuggestionsList extends LitElement {
  static styles: CSSResultGroup = [Styles];

  /** サジェスト候補データ */
  @property({ type: Array }) suggestData: SuggestionData[] = [];

  /** キー操作でハイライト中の候補インデックス（-1は未選択） */
  @property({ type: Number }) highlightedSuggestionIndex: number = -1;

  /** 候補選択イベントのdetail.idに使うデータキー名 */
  @property() itemIdKey: string = '';

  /** 候補選択イベントのdetail.labelに使うデータキー名 */
  @property() itemLabelKey: string = '';

  /** エイリアス等の補足テキストを取得するデータキー名 */
  @property() subTextKey: string = '';

  /** シンプル検索時の列見出しテキスト */
  @property() title: string = '';

  /** APIレスポンス受信済みかどうか */
  @property({ type: Boolean }) hasApiResponse: boolean = false;

  /**
   * 候補が選択されたことを親コンポーネントへ伝えるためにカスタムイベントを発火する
   */
  private _handleSelect(item: SuggestionData): void {
    this.dispatchEvent(
      new CustomEvent('suggestion-selected', {
        detail: item,
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * インデックス署名がunknownのため、テンプレートで安全に表示できるようstring型へ絞り込む
   */
  private _toDisplayString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  render(): TemplateResult {
    return html`
      ${this.title ? html`<h3 class="title">${this.title}</h3>` : nothing}
      <ul class="list">
        ${!this.hasApiResponse
          ? nothing
          : !this.suggestData || this.suggestData.length === 0
            ? html`<li class="item -empty">No results</li>`
            : map(
                this.suggestData,
                (item: SuggestionData, index: number) => html`
                  <li
                    class="item ${this.highlightedSuggestionIndex === index
                      ? '-selected'
                      : ''}"
                    @mousedown="${() => this._handleSelect(item)}"
                    ${(scrollIntoView as ScrollIntoViewDirective)(
                      this.highlightedSuggestionIndex === index
                    )}
                  >
                    ${unsafeHTML(
                      item.highlight ||
                        this._toDisplayString(item[this.itemLabelKey])
                    )}
                    ${this.subTextKey && item[this.subTextKey]
                      ? html`<span class="sub">
                          alias:
                          ${this._toDisplayString(item[this.subTextKey])}</span
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
