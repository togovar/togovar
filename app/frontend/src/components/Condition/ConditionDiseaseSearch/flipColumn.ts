import { directive, AsyncDirective } from 'lit/async-directive.js';
import type { ElementPart, Part } from 'lit/directive.js';
import { noChange, nothing } from 'lit';

/**
 * flip ディレクティブに渡すアニメーション設定型。
 * 各フィールドは update() の destructuring デフォルト値と対応している。
 */
type FlipOptions = {
  id?: string;
  role?: string;
  options?: KeyframeAnimationOptions;
  heroId?: string;
  scrolledHeroRect?: RectLike | null;
};

/**
 * 矩形サイズの最小型。DOMRect はこの型の構造的部分集合なので相互に代入可能。
 * disconnectedRects のストアや boundingRect に DOMRect とプレーンオブジェクトの両方を扱うため定義する。
 */
type RectLike = { x: number; y: number; width: number; height: number };

/**
 * DOM から切り離されたノードの矩形情報を保持するグローバルマップ。
 * 切り離しアニメーション中に要素が再接続されたときに前位置を取り出すため、
 * インスタンス外のスコープに置いてディレクティブ間で共有する。
 */
const disconnectedRects = new Map<string, RectLike>();

/**
 * オントロジーカードの FLIP アニメーションを実装する Lit AsyncDirective。
 * カードが hero ↔ parents/children 間を遷移するときに、位置変化を補間してスムーズに見せる。
 * AsyncDirective を使うのは、disconnect 時に削除アニメーションを完走させる必要があるため。
 */
class Flip extends AsyncDirective {
  /** このディレクティブが束縛されている要素 */
  private element!: Element;

  /** 前フレームの要素位置。FLIP アニメーションの "first" として使う。 */
  private boundingRect: RectLike | undefined = undefined;

  /** 要素に紐付く疾患オントロジー ID */
  private id: string | undefined = undefined;

  /** このカラムの役割（'hero' / 'parents' / 'children'）。削除アニメーションの判定に使う。 */
  private role: string = '';

  /**
   * 現在の hero ノード ID。
   * 自身が hero でなくなったときにカードをフェードアウトさせるため保持する。
   */
  private heroId: string | undefined = undefined;

  /**
   * スクロール後の hero 要素の矩形。hero ノードの FLIP アニメーション起点に使う。
   * スクロールが発生すると getBoundingClientRect の値が変わるため、別途保持が必要。
   */
  private scrolledHeroRect: RectLike | null = null;

  /** animate() に渡すタイミング設定。呼び出し元から注入することでアニメーション速度を一元管理する。 */
  private options: KeyframeAnimationOptions = {};

  /**
   * ディレクティブファクトリーが受け取る引数のシグネチャを定義する。
   * render() の引数がそのまま flip() 呼び出し時の型になるため、正しく宣言することが重要。
   * 実際の描画処理は update() で行い、ここでは nothing を返すだけにする。
   */
  render(_opts?: FlipOptions): typeof nothing {
    return nothing;
  }

  /**
   * プロパティが変化するたびに呼ばれ、FLIP アニメーションのセットアップと
   * hero でなくなったカードの削除アニメーションを起動する。
   * update() で処理することで、render() との引数型の一致を保ちながら ElementPart にアクセスできる。
   */
  override update(part: Part, props: unknown[]): typeof noChange {
    const el = (part as ElementPart).element;
    const {
      id,
      role = '',
      options = {},
      heroId,
      scrolledHeroRect = null,
    } = (props[0] as FlipOptions | undefined) ?? {};

    this.id = id;
    this.role = role;
    this.heroId = heroId;
    this.scrolledHeroRect = scrolledHeroRect;

    if (
      this.role === 'hero' &&
      this.id !== this.heroId &&
      this.id !== 'MONDO_0000001' &&
      this.id !== 'dummy'
    ) {
      disconnectedRects.set(this.id!, el.getBoundingClientRect() as RectLike);
      this._remove();
    }

    if (this.role !== 'hero' && !disconnectedRects.has(this.id!)) {
      disconnectedRects.set(this.id!, { y: 0, x: 0, width: 0, height: 0 });
    }

    this.options = { ...this.options, ...options };

    if (this.element !== el) {
      this.element = el;
    }

    if (this.boundingRect) {
      this.boundingRect = this.element.getBoundingClientRect() as RectLike;
    }

    // LitElement のバッチ更新が完了した直後に FLIP アニメーションの "last" フレームを取得する
    void Promise.resolve().then(() => this._prepareToFlip());

    return noChange;
  }

  /**
   * 要素が DOM から切り離されたときに削除アニメーションを起動し、
   * 矩形情報をマップに保存して再接続時に参照できるようにする。
   */
  override disconnected(): void {
    if (this.role === 'hero') {
      this._remove();
    }

    this.boundingRect = this.element.getBoundingClientRect() as RectLike;
    if (this.id !== undefined) {
      disconnectedRects.set(this.id, this.boundingRect);
      requestAnimationFrame(() => {
        if (this.id !== undefined && disconnectedRects.has(this.id)) {
          this._remove();
        }
      });
    }
  }

  /**
   * FLIP の "first" フレームを確定させてから flip() を呼び出す。
   * boundingRect が未取得のときだけ disconnectedRects か getBoundingClientRect から補完する。
   */
  private _prepareToFlip(): void {
    if (!this.boundingRect) {
      const stored = this.id !== undefined ? disconnectedRects.get(this.id) : undefined;
      this.boundingRect = stored ?? (this.element.getBoundingClientRect() as RectLike);
      if (this.id !== undefined) {
        disconnectedRects.delete(this.id);
      }
    }

    this._flip();
  }

  /**
   * FLIP アニメーションの "first → last" 補間を実行する。
   * deltaY が 0 かつ removing でなければ animate() を呼ばずに早期 return することで
   * 不要なアニメーション登録を防ぐ。
   */
  private _flip(removing?: boolean): void {
    let previous: RectLike | null | undefined = this.boundingRect;

    if (this.id === this.heroId) {
      previous = this.scrolledHeroRect;
    }

    this.boundingRect = this.element.getBoundingClientRect() as RectLike;

    const deltaY = (previous?.y ?? 0) - (this.boundingRect?.y ?? 0);

    if (!deltaY && !removing) return;

    this.element.animate(
      [
        { transform: `translate(0, ${deltaY}px)` },
        { transform: 'translate(0,0)' },
      ],
      this.options
    );
  }

  /**
   * カードをフェードアウトしながら DOM から取り除く。
   * hero 以外へのロール変更や disconnect 時に呼ばれ、アニメーション完了後に remove() する。
   */
  private _remove(): void {
    const rect = this.element.getBoundingClientRect();
    this.element.animate(
      [
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: `translateY(${rect.y + 200}px)` },
      ],
      this.options
    ).onfinish = () => {
      if (this.id !== undefined && disconnectedRects.has(this.id)) {
        disconnectedRects.delete(this.id);
      }
      this.element.remove();
    };
  }
}

export const flip = directive(Flip);
