import '../../ErrorModal';

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ref, createRef } from 'lit/directives/ref.js';
import { repeat } from 'lit/directives/repeat.js';
import type { CSSResultGroup, PropertyValues, TemplateResult } from 'lit';
import type { Ref } from 'lit/directives/ref.js';

import './ConditionDiseaseSearchColumn';
import { Column } from './ConditionDiseaseSearchColumn';
import type { OntologyNode } from './ConditionDiseaseSearchOntologyCard';

import { cachedAxios } from '../../../utils/cachedAxios';
import { API_URL } from '../../../global';

/**
 * カラムに割り当てられる役割の型。
 * _parents / _children はアニメーション遷移中に一時的に表示する「送り出し元」カラム。
 */
type ColumnRole = 'parents' | 'hero' | 'children' | '_parents' | '_children';

/** column-click イベントの detail 型 */
type ColumnClickDetail = { id: string; role: string; rect: DOMRect };

/** データなし状態やローディング中のプレースホルダーノード */
const DUMMY_NODE: OntologyNode = { id: 'dummy', label: 'dummy' };

/**
 * オントロジーツリーを parents / hero / children の3カラムで表示するビュー。
 * ノードのクリックでカラムを左右にスライドさせる FLIP アニメーションを管理する。
 */
@customElement('condition-disease-ontology-view')
export class ConditionDiseaseOntologyView extends LitElement {
  static styles: CSSResultGroup = css`
    :host {
      font-size: 10px;
      display: block;
      height: 100%;
      position: relative;
    }

    .clip {
      height: 200px;
      overflow: hidden;
      position: relative;
    }

    .flex {
      height: 100%;
      display: flex;
      flex-direction: row;
    }
  `;

  // ── DOM 参照（非リアクティブ） ──────────────────────────────────────────────

  /**
   * スライドアニメーションをかけるフレックスコンテナへの参照。
   * updated() で animate() を直接呼ぶため ref で保持する。
   */
  private readonly flexRef: Ref<HTMLElement> = createRef<HTMLElement>();

  /**
   * カラム幅の計算基準となるクリップ領域への参照。
   * willUpdate で getBoundingClientRect を呼び nodeWidth / gap を求める。
   */
  private readonly clipRef: Ref<HTMLElement> = createRef<HTMLElement>();

  /**
   * カラム幅取得用に任意の1カラム要素を指す参照。
   * すべてのカラムに同じ ref を付与し、最後に接続された要素の幅を使う。
   */
  private readonly nodeRef: Ref<HTMLElement> = createRef<HTMLElement>();

  // ── アニメーション関連（非リアクティブ） ────────────────────────────────────

  /** スライド方向。'left' が子方向、'right' が親方向への遷移。'' は静止状態。 */
  private movement: '' | 'left' | 'right' = '';

  /** フレックスコンテナに適用する width スタイル値。3カラム時は '100%'、4カラム遷移時は 'Xpx'。 */
  private flexWidth: string = '100%';

  /** 1カラム分のスライド量（px）。nodeWidth + gap で計算する。 */
  private deltaWidth: number = 0;

  /** 1カラムの表示幅（px）。クリップ領域からはみ出た分を差し引いた値。 */
  private nodeWidth: number = 0;

  /** カラム間のギャップ（px）。clipWidth から3カラム分の幅を引いた残りの半分。 */
  private gap: number = 0;

  /**
   * 現在実行中のスライドアニメーション。
   * onfinish でカラム構成をリセットするために保持する。
   * HTMLElement.animate() メソッドとの名前衝突を避けるため _slideAnimation とする。
   */
  private _slideAnimation: Animation | null = null;

  /** column-click 時にクリックされたカードの DOMRect。FLIP アニメーションのヒーロー起点に使う。 */
  private scrolledRect: DOMRect | null = null;

  // ── API ──────────────────────────────────────────────────────────────────

  /**
   * /api/inspect エンドポイントへのキャッシュ付き API クライアント。
   * 同じ disease ノードを繰り返し取得する際のリクエスト抑制のため。
   */
  private readonly api: cachedAxios = new cachedAxios(`${API_URL}/api/inspect`);

  // ── データ管理（非リアクティブ） ─────────────────────────────────────────────

  /**
   * 各ロールに対応するノード配列。
   * _parents / _children はアニメーション中の「前フレーム」として使うため保持する。
   */
  private dataColumns: Record<ColumnRole, OntologyNode[]> = {
    _parents: [],
    parents: [],
    hero: [],
    children: [],
    _children: [],
  };

  /** カラムスライドのタイミング設定。OntologyCard の FLIP とは独立して管理する。 */
  private readonly animationOptions: KeyframeAnimationOptions = {
    duration: 500,
    easing: 'ease-in-out',
  };

  // ── リアクティブプロパティ ────────────────────────────────────────────────

  /**
   * API から取得したノードデータ。変更時に willUpdate → render の順で表示を更新する。
   * state にして属性観察を省略するのは、OntologyNode を属性値で表現できないため。
   */
  @state() private data: OntologyNode = { id: '' };

  /**
   * 表示中のカラム役割配列。3カラム（通常）↔ 4カラム（遷移中）を切り替えることで
   * スライドアニメーションを実現する。
   */
  @state() private _columns: ColumnRole[] = ['parents', 'hero', 'children'];

  // ── _id の getter / setter ───────────────────────────────────────────────

  /** _id プロパティのバッキングフィールド */
  private _idValue: string = '';

  /**
   * 親テンプレートから ._id=${diseaseId} で設定されるプロパティ。
   * setter で ID が変わったときだけ API を呼び出し、二重フェッチを防ぐ。
   * @property を使わず plain getter/setter にするのは、属性観察が不要で
   * リアクティブな再描画は data の変化で十分なため。
   */
  get _id(): string {
    return this._idValue;
  }
  set _id(id: string) {
    this._idValue = id;
    if (this.data?.id !== id) {
      this._fetchNode(id);
    }
  }

  // ── Lit ライフサイクル ────────────────────────────────────────────────────

  /**
   * data 変化時にアニメーション用の前後カラムデータを準備し、
   * _columns 変化時にカラム幅・ギャップ・スライド量を再計算する。
   * render 前に呼ばれるため、非リアクティブなフィールドをここで更新する。
   */
  override willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has('data')) {
      const prevData = changedProperties.get('data') as OntologyNode | undefined;
      if (prevData && this.data.id && prevData.id !== this.data.id) {
        this.dataColumns._parents = prevData.parents ?? [DUMMY_NODE];
        this.dataColumns._children = prevData.children ?? [DUMMY_NODE];

        if (this._columns.length === 4) {
          let movement: '' | 'left' | 'right' = '';
          if (this._columns.includes('_parents')) {
            movement = 'left';
          } else if (this._columns.includes('_children')) {
            movement = 'right';
          }

          if (movement === 'left') {
            this.dataColumns.hero = this.dataColumns._children;
          } else if (movement === 'right') {
            this.dataColumns.hero = this.dataColumns._parents;
          }
        } else {
          this.dataColumns.hero = [this.data];
        }

        this.dataColumns.parents = this.data.parents ?? [];
        this.dataColumns.children = this.data.children ?? [];
      }
    }

    if (changedProperties.has('_columns')) {
      const nodeRect = this.nodeRef.value?.getBoundingClientRect();
      const clipRect = this.clipRef.value?.getBoundingClientRect();

      if (nodeRect && clipRect) {
        this.nodeWidth = nodeRect.width - (nodeRect.right - clipRect.right) || 0;
        this.gap = (clipRect.width - this.nodeWidth * 3) / 2;
      } else {
        this.nodeWidth = 0;
        this.gap = 0;
      }

      this.flexWidth =
        this._columns.length === 4
          ? `${this.nodeWidth * this._columns.length + (this._columns.length - 1) * this.gap}px`
          : '100%';

      this.deltaWidth = this.nodeWidth + this.gap;
    }
  }

  /**
   * 初回レンダリング後に初期ノードを取得する。
   * firstUpdated は DOM が確定してから呼ばれるため、ref が取得できる最初のタイミング。
   */
  override firstUpdated(_changedProperties: PropertyValues): void {
    this.api.get<OntologyNode>(`/disease?node=${this._id}`).then(({ data }) => {
      this.data = data;
    });
  }

  /**
   * movement の値に応じてフレックスコンテナをスライドアニメーションさせる。
   * アニメーション完了後に _columns を3カラムに戻し movement をリセットする。
   */
  override updated(_changedProperties: PropertyValues): void {
    if (!this.flexRef.value) return;

    if (this.movement === 'left') {
      this._slideAnimation = this.flexRef.value.animate(
        [{ transform: 'translateX(0)' }, { transform: `translateX(${-this.deltaWidth}px)` }],
        this.animationOptions
      );
    } else if (this.movement === 'right') {
      this._slideAnimation = this.flexRef.value.animate(
        [{ transform: `translateX(${-this.deltaWidth}px)` }, { transform: 'translateX(0)' }],
        this.animationOptions
      );
    }

    if (this._slideAnimation) {
      this._slideAnimation.onfinish = () => {
        this.movement = '';
        this._columns = ['parents', 'hero', 'children'];
        this._slideAnimation = null;
      };
    }
  }

  /** parents / children カラムへのクリックを受け取ってノード遷移を開始する。 */
  override render(): TemplateResult {
    return html`
      <div class="clip" ${ref(this.clipRef)}>
        <div
          class="flex"
          @column-click=${this._handleClick}
          style="width: ${this.flexWidth}"
          ${ref(this.flexRef)}
        >
          ${repeat(
            this._columns,
            (column) => column,
            (column) => html`
              <ontology-column
                .role=${column}
                .nodes=${this.dataColumns[column].length
                  ? this.dataColumns[column]
                  : [DUMMY_NODE]}
                ${ref(this.nodeRef)}
                .heroId=${column === 'hero' ? this.data.id : undefined}
                .scrolledHeroRect=${this.scrolledRect}
                .animationOptions=${this.animationOptions}
              ></ontology-column>
            `
          )}
        </div>
      </div>
    `;
  }

  // ── プライベートメソッド ────────────────────────────────────────────────────

  /**
   * ローディング開始を親に通知する。
   * ローディング状態の管理を親（ConditionDiseaseSearch）に委譲することで
   * このコンポーネントはデータ取得のみに専念できる。
   */
  private _loadingStarted(): void {
    this.dispatchEvent(
      new CustomEvent('loading-started', { bubbles: true, composed: true })
    );
  }

  /**
   * データ取得完了後に disease-selected と loading-ended を発火する。
   * データがある場合のみ disease-selected を発火し、選択確定を親に伝える。
   */
  private _loadingEnded(): void {
    if (this.data.id) {
      const raw = this.data.label ?? '';
      const label = raw.charAt(0).toUpperCase() + raw.slice(1);
      this.dispatchEvent(
        new CustomEvent('disease-selected', {
          detail: { id: this.data.id, label },
          bubbles: true,
          composed: true,
        })
      );
    }

    this.dispatchEvent(
      new CustomEvent('loading-ended', { bubbles: true, composed: true })
    );
  }

  /**
   * 指定 ID のノードデータを API から取得して data を更新する。
   * セッターと firstUpdated の両方から呼ばれるため、重複フェッチは cachedAxios がキャッシュで吸収する。
   */
  private _fetchNode(id: string): void {
    this._loadingStarted();
    this.api.get<OntologyNode>(`/disease?node=${id}`).then(({ data }) => {
      this.data = data;
      this._loadingEnded();
    });
  }

  /**
   * ontology-column からバブルアップした column-click を処理する。
   * hero カラムのクリックは無視し、parents / children のみ遷移対象にすることで
   * 現在選択中のノードに対する再取得を防ぐ。
   */
  private _handleClick(e: Event): void {
    if (!(e.target instanceof Column)) return;
    const column = e.target;
    if (column.role !== 'parents' && column.role !== 'children') return;

    const event = e as CustomEvent<ColumnClickDetail>;
    this.scrolledRect = event.detail?.rect ?? null;
    this._loadingStarted();

    this.api.get<OntologyNode>(`/disease?node=${event.detail.id}`).then(({ data }) => {
      this.data = data;
      this._loadingEnded();
      void this.updateComplete.then(() => {
        if (event.detail.role === 'children') {
          this.movement = 'left';
          this._columns = ['_parents', 'parents', 'hero', 'children'];
        } else if (event.detail.role === 'parents') {
          this.movement = 'right';
          this._columns = ['parents', 'hero', 'children', '_children'];
        }
      });
    });
  }
}
