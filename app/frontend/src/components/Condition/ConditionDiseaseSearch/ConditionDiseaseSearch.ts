import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { TemplateResult } from 'lit';

import './ConditionDiseaseSearchOntologyView';
import '../../SearchField/suggestions/SearchFieldWithSuggestions';

import { API_URL } from '../../../global';

const suggestAPI = `${API_URL}/api/search/disease`;

/** disease-selected / new-suggestion-selected イベントの detail 型 */
type DiseaseEventDetail = { id: string; label: string };

/**
 * 疾患検索コンポーネント。
 * テキスト入力によるサジェスト検索とオントロジーツリーによる階層選択の2方式を統合し、
 * 選択結果を disease-selected イベントで上位に伝播する。
 */
@customElement('condition-disease-search')
export class ConditionDiseaseSearch extends LitElement {
  /**
   * ローディング表示に 200ms の遅延を設けるためのタイマー。
   * 即時表示するとちらつきが起きるため、短い通信ではスピナーを出さない。
   */
  private _timer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 選択中の疾患 ID を condition-disease-ontology-view に渡して表示を同期するため reflect: true にする。
   * HTML 属性からも設定できるようにすることで外部から初期値を注入できる。
   */
  @property({ type: String, reflect: true }) diseaseId: string = 'MONDO_0000001';

  /**
   * ローディングスピナーの表示をコンポーネント内部でのみ制御するため @state にする。
   * 外部から直接操作される必要がないため @property ではなく内部状態として管理する。
   */
  @state() private loading: boolean = false;

  /**
   * 親要素に自身を appendChild して DOM ツリーへの組み込みとインスタンス生成を1ステップで行う。
   * 利用側が createElement → appendChild の2ステップを踏まなくて済むようにするため。
   * @customElement 登録後はブラウザが引数なしで生成するケースがあるため、el は optional にする。
   */
  constructor(el?: Element) {
    super();
    if (el) {
      el.appendChild(this);
    }
  }

  /**
   * Shadow DOM を使わず Light DOM にレンダリングする。
   * 外側の CSS からスタイリングできるようにするため。
   */
  override createRenderRoot(): Element | ShadowRoot {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
  }

  /**
   * 切り離し時にローディングタイマーをキャンセルする。
   * タイマーが残ったまま要素が破棄されると、切り離し後に loading が true へ更新され得るため。
   */
  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._timer !== null) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  /**
   * サジェスト検索とオントロジーツリーから disease-selected / new-suggestion-selected が
   * 上がってきたときの統合ハンドラ。diseaseId を更新して disease-selected を再発火する。
   * 2つのイベント経路を1メソッドで処理することで重複ロジックを排除するため。
   */
  private _changeDiseaseEventHandler(e: Event): void {
    e.stopPropagation();
    const { id, label } = (e as CustomEvent<DiseaseEventDetail>).detail;
    this.diseaseId = id;
    this.dispatchEvent(
      new CustomEvent<DiseaseEventDetail>('disease-selected', {
        detail: { id, label },
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * API 呼び出し開始時に 200ms のウォームアップ遅延後にスピナーを表示する。
   * 短い通信でちらつきが起きないよう、即時表示を避けるため。
   */
  private _loadingStartedHandler(e: Event): void {
    e.stopPropagation();
    if (this._timer !== null) {
      clearTimeout(this._timer);
    }
    this._timer = setTimeout(() => {
      this.loading = true;
    }, 200);
  }

  /**
   * API 呼び出し完了時にスピナーを消し、遅延タイマーをキャンセルする。
   * タイマーが残ったまま通信が完了するとスピナーが後から現れる不整合を防ぐため。
   */
  private _loadingEndedHandler(e: Event): void {
    e.stopPropagation();
    this.loading = false;
    if (this._timer !== null) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  /** SearchFieldWithSuggestions の options は参照同一性で更新判定されるため、毎回オブジェクトを生成しない。 */
  private static readonly _SUGGEST_OPTIONS = {
    valueMappings: { valueKey: 'id', labelKey: 'label' },
  } as const;

  /** サジェスト入力欄とオントロジーツリーを並べたコンポーネントの骨格を描画する。 */
  override render(): TemplateResult {
    return html`
      <search-field-with-suggestions
        .suggestAPIURL=${suggestAPI}
        .suggestAPIQueryParam=${'term'}
        .options=${ConditionDiseaseSearch._SUGGEST_OPTIONS}
        .placeholder=${'Breast-ovarian cancer, familial 2'}
        @new-suggestion-selected=${this._changeDiseaseEventHandler}
      ></search-field-with-suggestions>

      <div class="container">
        ${this.loading
          ? html`<div class="loading"><span></span></div>`
          : nothing}

        <condition-disease-ontology-view
          ._id=${this.diseaseId}
          @disease-selected=${this._changeDiseaseEventHandler}
          @loading-started=${this._loadingStartedHandler}
          @loading-ended=${this._loadingEndedHandler}
        ></condition-disease-ontology-view>
      </div>
    `;
  }
}
